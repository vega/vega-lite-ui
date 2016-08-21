;(function() {
/*!
 * JSON3 with compact stringify -- Modified by Kanit Wongsuphasawat.   https://github.com/kanitw/json3
 *
 * Forked from JSON v3.3.2 | https://bestiejs.github.io/json3 | Copyright 2012-2014, Kit Cambridge | http://kit.mit-license.org
 */
;(function () {
  // Detect the `define` function exposed by asynchronous module loaders. The
  // strict `define` check is necessary for compatibility with `r.js`.
  var isLoader = typeof define === "function" && define.amd;

  // A set of types used to distinguish objects from primitives.
  var objectTypes = {
    "function": true,
    "object": true
  };

  // Detect the `exports` object exposed by CommonJS implementations.
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  // Use the `global` object exposed by Node (including Browserify via
  // `insert-module-globals`), Narwhal, and Ringo as the default context,
  // and the `window` object in browsers. Rhino exports a `global` function
  // instead.
  var root = objectTypes[typeof window] && window || this,
      freeGlobal = freeExports && objectTypes[typeof module] && module && !module.nodeType && typeof global == "object" && global;

  if (freeGlobal && (freeGlobal["global"] === freeGlobal || freeGlobal["window"] === freeGlobal || freeGlobal["self"] === freeGlobal)) {
    root = freeGlobal;
  }

  // Public: Initializes JSON 3 using the given `context` object, attaching the
  // `stringify` and `parse` functions to the specified `exports` object.
  function runInContext(context, exports) {
    context || (context = root["Object"]());
    exports || (exports = root["Object"]());

    // Native constructor aliases.
    var Number = context["Number"] || root["Number"],
        String = context["String"] || root["String"],
        Object = context["Object"] || root["Object"],
        Date = context["Date"] || root["Date"],
        SyntaxError = context["SyntaxError"] || root["SyntaxError"],
        TypeError = context["TypeError"] || root["TypeError"],
        Math = context["Math"] || root["Math"],
        nativeJSON = context["JSON"] || root["JSON"];

    // Delegate to the native `stringify` and `parse` implementations.
    if (typeof nativeJSON == "object" && nativeJSON) {
      exports.stringify = nativeJSON.stringify;
      exports.parse = nativeJSON.parse;
    }

    // Convenience aliases.
    var objectProto = Object.prototype,
        getClass = objectProto.toString,
        isProperty, forEach, undef;

    // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
    var isExtended = new Date(-3509827334573292);
    try {
      // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
      // results for certain dates in Opera >= 10.53.
      isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() === 1 &&
        // Safari < 2.0.2 stores the internal millisecond time value correctly,
        // but clips the values returned by the date methods to the range of
        // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
        isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
    } catch (exception) {}

    // Internal: Determines whether the native `JSON.stringify` and `parse`
    // implementations are spec-compliant. Based on work by Ken Snyder.
    function has(name) {
      if (has[name] !== undef) {
        // Return cached feature test result.
        return has[name];
      }
      var isSupported;
      if (name == "bug-string-char-index") {
        // IE <= 7 doesn't support accessing string characters using square
        // bracket notation. IE 8 only supports this for primitives.
        isSupported = "a"[0] != "a";
      } else if (name == "json") {
        // Indicates whether both `JSON.stringify` and `JSON.parse` are
        // supported.
        isSupported = has("json-stringify") && has("json-parse");
      } else {
        var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
        // Test `JSON.stringify`.
        if (name == "json-stringify") {
          var stringify = exports.stringify, stringifySupported = typeof stringify == "function" && isExtended;
          if (stringifySupported) {
            // A test function object with a custom `toJSON` method.
            (value = function () {
              return 1;
            }).toJSON = value;
            try {
              stringifySupported =
                // Firefox 3.1b1 and b2 serialize string, number, and boolean
                // primitives as object literals.
                stringify(0) === "0" &&
                // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
                // literals.
                stringify(new Number()) === "0" &&
                stringify(new String()) == '""' &&
                // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
                // does not define a canonical JSON representation (this applies to
                // objects with `toJSON` properties as well, *unless* they are nested
                // within an object or array).
                stringify(getClass) === undef &&
                // IE 8 serializes `undefined` as `"undefined"`. Safari <= 5.1.7 and
                // FF 3.1b3 pass this test.
                stringify(undef) === undef &&
                // Safari <= 5.1.7 and FF 3.1b3 throw `Error`s and `TypeError`s,
                // respectively, if the value is omitted entirely.
                stringify() === undef &&
                // FF 3.1b1, 2 throw an error if the given value is not a number,
                // string, array, object, Boolean, or `null` literal. This applies to
                // objects with custom `toJSON` methods as well, unless they are nested
                // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
                // methods entirely.
                stringify(value) === "1" &&
                stringify([value]) == "[1]" &&
                // Prototype <= 1.6.1 serializes `[undefined]` as `"[]"` instead of
                // `"[null]"`.
                stringify([undef]) == "[null]" &&
                // YUI 3.0.0b1 fails to serialize `null` literals.
                stringify(null) == "null" &&
                // FF 3.1b1, 2 halts serialization if an array contains a function:
                // `[1, true, getClass, 1]` serializes as "[1,true,],". FF 3.1b3
                // elides non-JSON values from objects and arrays, unless they
                // define custom `toJSON` methods.
                stringify([undef, getClass, null]) == "[null,null,null]" &&
                // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
                // where character escape codes are expected (e.g., `\b` => `\u0008`).
                stringify({ "a": [value, true, false, null, "\x00\b\n\f\r\t"] }) == serialized &&
                // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
                stringify(null, value) === "1" &&
                stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
                // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
                // serialize extended years.
                stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
                // The milliseconds are optional in ES 5, but required in 5.1.
                stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
                // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
                // four-digit years instead of six-digit years. Credits: @Yaffle.
                stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
                // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
                // values less than 1000. Credits: @Yaffle.
                stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
            } catch (exception) {
              stringifySupported = false;
            }
          }
          isSupported = stringifySupported;
        }
        // Test `JSON.parse`.
        if (name == "json-parse") {
          var parse = exports.parse;
          if (typeof parse == "function") {
            try {
              // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
              // Conforming implementations should also coerce the initial argument to
              // a string prior to parsing.
              if (parse("0") === 0 && !parse(false)) {
                // Simple parsing test.
                value = parse(serialized);
                var parseSupported = value["a"].length == 5 && value["a"][0] === 1;
                if (parseSupported) {
                  try {
                    // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
                    parseSupported = !parse('"\t"');
                  } catch (exception) {}
                  if (parseSupported) {
                    try {
                      // FF 4.0 and 4.0.1 allow leading `+` signs and leading
                      // decimal points. FF 4.0, 4.0.1, and IE 9-10 also allow
                      // certain octal literals.
                      parseSupported = parse("01") !== 1;
                    } catch (exception) {}
                  }
                  if (parseSupported) {
                    try {
                      // FF 4.0, 4.0.1, and Rhino 1.7R3-R4 allow trailing decimal
                      // points. These environments, along with FF 3.1b1 and 2,
                      // also allow trailing commas in JSON objects and arrays.
                      parseSupported = parse("1.") !== 1;
                    } catch (exception) {}
                  }
                }
              }
            } catch (exception) {
              parseSupported = false;
            }
          }
          isSupported = parseSupported;
        }
      }
      return has[name] = !!isSupported;
    }

    if (true) { // used to be !has("json")
      // Common `[[Class]]` name aliases.
      var functionClass = "[object Function]",
          dateClass = "[object Date]",
          numberClass = "[object Number]",
          stringClass = "[object String]",
          arrayClass = "[object Array]",
          booleanClass = "[object Boolean]";

      // Detect incomplete support for accessing string characters by index.
      var charIndexBuggy = has("bug-string-char-index");

      // Define additional utility methods if the `Date` methods are buggy.
      if (!isExtended) {
        var floor = Math.floor;
        // A mapping between the months of the year and the number of days between
        // January 1st and the first of the respective month.
        var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        // Internal: Calculates the number of days between the Unix epoch and the
        // first day of the given month.
        var getDay = function (year, month) {
          return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
        };
      }

      // Internal: Determines if a property is a direct property of the given
      // object. Delegates to the native `Object#hasOwnProperty` method.
      if (!(isProperty = objectProto.hasOwnProperty)) {
        isProperty = function (property) {
          var members = {}, constructor;
          if ((members.__proto__ = null, members.__proto__ = {
            // The *proto* property cannot be set multiple times in recent
            // versions of Firefox and SeaMonkey.
            "toString": 1
          }, members).toString != getClass) {
            // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
            // supports the mutable *proto* property.
            isProperty = function (property) {
              // Capture and break the object's prototype chain (see section 8.6.2
              // of the ES 5.1 spec). The parenthesized expression prevents an
              // unsafe transformation by the Closure Compiler.
              var original = this.__proto__, result = property in (this.__proto__ = null, this);
              // Restore the original prototype chain.
              this.__proto__ = original;
              return result;
            };
          } else {
            // Capture a reference to the top-level `Object` constructor.
            constructor = members.constructor;
            // Use the `constructor` property to simulate `Object#hasOwnProperty` in
            // other environments.
            isProperty = function (property) {
              var parent = (this.constructor || constructor).prototype;
              return property in this && !(property in parent && this[property] === parent[property]);
            };
          }
          members = null;
          return isProperty.call(this, property);
        };
      }

      // Internal: Normalizes the `for...in` iteration algorithm across
      // environments. Each enumerated key is yielded to a `callback` function.
      forEach = function (object, callback) {
        var size = 0, Properties, members, property;

        // Tests for bugs in the current environment's `for...in` algorithm. The
        // `valueOf` property inherits the non-enumerable flag from
        // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
        (Properties = function () {
          this.valueOf = 0;
        }).prototype.valueOf = 0;

        // Iterate over a new instance of the `Properties` class.
        members = new Properties();
        for (property in members) {
          // Ignore all properties inherited from `Object.prototype`.
          if (isProperty.call(members, property)) {
            size++;
          }
        }
        Properties = members = null;

        // Normalize the iteration algorithm.
        if (!size) {
          // A list of non-enumerable properties inherited from `Object.prototype`.
          members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
          // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
          // properties.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, length;
            var hasProperty = !isFunction && typeof object.constructor != "function" && objectTypes[typeof object.hasOwnProperty] && object.hasOwnProperty || isProperty;
            for (property in object) {
              // Gecko <= 1.0 enumerates the `prototype` property of functions under
              // certain conditions; IE does not.
              if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
                callback(property);
              }
            }
            // Manually invoke the callback for each non-enumerable property.
            for (length = members.length; property = members[--length]; hasProperty.call(object, property) && callback(property));
          };
        } else if (size == 2) {
          // Safari <= 2.0.4 enumerates shadowed properties twice.
          forEach = function (object, callback) {
            // Create a set of iterated properties.
            var members = {}, isFunction = getClass.call(object) == functionClass, property;
            for (property in object) {
              // Store each property name to prevent double enumeration. The
              // `prototype` property of functions is not enumerated due to cross-
              // environment inconsistencies.
              if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
                callback(property);
              }
            }
          };
        } else {
          // No bugs detected; use the standard `for...in` algorithm.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, isConstructor;
            for (property in object) {
              if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
                callback(property);
              }
            }
            // Manually invoke the callback for the `constructor` property due to
            // cross-environment inconsistencies.
            if (isConstructor || isProperty.call(object, (property = "constructor"))) {
              callback(property);
            }
          };
        }
        return forEach(object, callback);
      };

      // Public: Serializes a JavaScript `value` as a JSON string. The optional
      // `filter` argument may specify either a function that alters how object and
      // array members are serialized, or an array of strings and numbers that
      // indicates which properties should be serialized. The optional `width`
      // argument may be either a string or number that specifies the indentation
      // level of the output.
      if (true) {
        // Internal: A map of control characters and their escaped equivalents.
        var Escapes = {
          92: "\\\\",
          34: '\\"',
          8: "\\b",
          12: "\\f",
          10: "\\n",
          13: "\\r",
          9: "\\t"
        };

        // Internal: Converts `value` into a zero-padded string such that its
        // length is at least equal to `width`. The `width` must be <= 6.
        var leadingZeroes = "000000";
        var toPaddedString = function (width, value) {
          // The `|| 0` expression is necessary to work around a bug in
          // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
          return (leadingZeroes + (value || 0)).slice(-width);
        };

        // Internal: Double-quotes a string `value`, replacing all ASCII control
        // characters (characters with code unit values between 0 and 31) with
        // their escaped equivalents. This is an implementation of the
        // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
        var unicodePrefix = "\\u00";
        var quote = function (value) {
          var result = '"', index = 0, length = value.length, useCharIndex = !charIndexBuggy || length > 10;
          var symbols = useCharIndex && (charIndexBuggy ? value.split("") : value);
          for (; index < length; index++) {
            var charCode = value.charCodeAt(index);
            // If the character is a control character, append its Unicode or
            // shorthand escape sequence; otherwise, append the character as-is.
            switch (charCode) {
              case 8: case 9: case 10: case 12: case 13: case 34: case 92:
                result += Escapes[charCode];
                break;
              default:
                if (charCode < 32) {
                  result += unicodePrefix + toPaddedString(2, charCode.toString(16));
                  break;
                }
                result += useCharIndex ? symbols[index] : value.charAt(index);
            }
          }
          return result + '"';
        };

        // Internal: Recursively serializes an object. Implements the
        // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
        var serialize = function (property, object, callback, properties, whitespace, indentation, stack, maxLineLength) {
          var value, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, result;

          maxLineLength = maxLineLength || 0;

          try {
            // Necessary for host object support.
            value = object[property];
          } catch (exception) {}
          if (typeof value == "object" && value) {
            className = getClass.call(value);
            if (className == dateClass && !isProperty.call(value, "toJSON")) {
              if (value > -1 / 0 && value < 1 / 0) {
                // Dates are serialized according to the `Date#toJSON` method
                // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
                // for the ISO 8601 date time string format.
                if (getDay) {
                  // Manually compute the year, month, date, hours, minutes,
                  // seconds, and milliseconds if the `getUTC*` methods are
                  // buggy. Adapted from @Yaffle's `date-shim` project.
                  date = floor(value / 864e5);
                  for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                  for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                  date = 1 + date - getDay(year, month);
                  // The `time` value specifies the time within the day (see ES
                  // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
                  // to compute `A modulo B`, as the `%` operator does not
                  // correspond to the `modulo` operation for negative numbers.
                  time = (value % 864e5 + 864e5) % 864e5;
                  // The hours, minutes, seconds, and milliseconds are obtained by
                  // decomposing the time within the day. See section 15.9.1.10.
                  hours = floor(time / 36e5) % 24;
                  minutes = floor(time / 6e4) % 60;
                  seconds = floor(time / 1e3) % 60;
                  milliseconds = time % 1e3;
                } else {
                  year = value.getUTCFullYear();
                  month = value.getUTCMonth();
                  date = value.getUTCDate();
                  hours = value.getUTCHours();
                  minutes = value.getUTCMinutes();
                  seconds = value.getUTCSeconds();
                  milliseconds = value.getUTCMilliseconds();
                }
                // Serialize extended years correctly.
                value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
                  "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
                  // Months, dates, hours, minutes, and seconds should have two
                  // digits; milliseconds should have three.
                  "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
                  // Milliseconds are optional in ES 5.0, but required in 5.1.
                  "." + toPaddedString(3, milliseconds) + "Z";
              } else {
                value = null;
              }
            } else if (typeof value.toJSON == "function" && ((className != numberClass && className != stringClass && className != arrayClass) || isProperty.call(value, "toJSON"))) {
              // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
              // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
              // ignores all `toJSON` methods on these objects unless they are
              // defined directly on an instance.
              value = value.toJSON(property);
            }
          }
          if (callback) {
            // If a replacement function was provided, call it to obtain the value
            // for serialization.
            value = callback.call(object, property, value);
          }
          if (value === null) {
            return "null";
          }
          className = getClass.call(value);
          if (className == booleanClass) {
            // Booleans are represented literally.
            return "" + value;
          } else if (className == numberClass) {
            // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
            // `"null"`.
            return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
          } else if (className == stringClass) {
            // Strings are double-quoted and escaped.
            return quote("" + value);
          }
          // Recursively serialize objects and arrays.
          if (typeof value == "object") {
            // Check for cyclic structures. This is a linear search; performance
            // is inversely proportional to the number of unique nested objects.
            for (length = stack.length; length--;) {
              if (stack[length] === value) {
                // Cyclic structures cannot be serialized by `JSON.stringify`.
                throw TypeError();
              }
            }
            // Add the object to the stack of traversed objects.
            stack.push(value);
            results = [];
            // Save the current indentation level and indent one additional level.
            prefix = indentation;
            indentation += whitespace;
            if (className == arrayClass) {
              var totalLength = indentation.length, result;
              // Recursively serialize array elements.
              for (index = 0, length = value.length; index < length; index++) {
                element = serialize(index, value, callback, properties, whitespace, indentation,
                  stack, maxLineLength);
                result = element === undef ? "null" : element;
                totalLength += result.length + (index > 0 ? 1 : 0);
                results.push(result);
              }
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" :
                  "[" + results.join(",") + "]"
                )
                : "[]";
            } else {
              var totalLength = indentation.length, index=0;
              // Recursively serialize object members. Members are selected from
              // either a user-specified list of property names, or the object
              // itself.
              forEach(properties || value, function (property) {
                var result, element = serialize(property, value, callback, properties, whitespace, indentation,
                                        stack, maxLineLength);

                if (element !== undef) {
                  // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
                  // is not the empty string, let `member` {quote(property) + ":"}
                  // be the concatenation of `member` and the `space` character."
                  // The "`space` character" refers to the literal space
                  // character, not the `space` {width} argument provided to
                  // `JSON.stringify`.
                  result = quote(property) + ":" + (whitespace ? " " : "") + element;
                  totalLength += result.length + (index++ > 0 ? 1 : 0);
                  results.push(result);
                }
              });
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" :
                  "{" + results.join(",") + "}"
                )
                : "{}";
            }
            // Remove the object from the traversed object stack.
            stack.pop();
            return result;
          }
        };

        // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.

        exports.stringify = function (source, filter, width, maxLineLength) {
          var whitespace, callback, properties, className;
          if (objectTypes[typeof filter] && filter) {
            if ((className = getClass.call(filter)) == functionClass) {
              callback = filter;
            } else if (className == arrayClass) {
              // Convert the property names array into a makeshift set.
              properties = {};
              for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((className = getClass.call(value)), className == stringClass || className == numberClass) && (properties[value] = 1));
            }
          }
          if (width) {
            if ((className = getClass.call(width)) == numberClass) {
              // Convert the `width` to an integer and create a string containing
              // `width` number of space characters.
              if ((width -= width % 1) > 0) {
                for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
              }
            } else if (className == stringClass) {
              whitespace = width.length <= 10 ? width : width.slice(0, 10);
            }
          }
          // Opera <= 7.54u2 discards the values associated with empty string keys
          // (`""`) only if they are used directly within an object member list
          // (e.g., `!("" in { "": 1})`).
          return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", [], maxLineLength);
        };

        exports.compactStringify = function (source, filter, width){
          return exports.stringify(source, filter, width, 60);
        }
      }

      // Public: Parses a JSON source string.
      if (!has("json-parse")) {
        var fromCharCode = String.fromCharCode;

        // Internal: A map of escaped control characters and their unescaped
        // equivalents.
        var Unescapes = {
          92: "\\",
          34: '"',
          47: "/",
          98: "\b",
          116: "\t",
          110: "\n",
          102: "\f",
          114: "\r"
        };

        // Internal: Stores the parser state.
        var Index, Source;

        // Internal: Resets the parser state and throws a `SyntaxError`.
        var abort = function () {
          Index = Source = null;
          throw SyntaxError();
        };

        // Internal: Returns the next token, or `"$"` if the parser has reached
        // the end of the source string. A token may be a string, number, `null`
        // literal, or Boolean literal.
        var lex = function () {
          var source = Source, length = source.length, value, begin, position, isSigned, charCode;
          while (Index < length) {
            charCode = source.charCodeAt(Index);
            switch (charCode) {
              case 9: case 10: case 13: case 32:
                // Skip whitespace tokens, including tabs, carriage returns, line
                // feeds, and space characters.
                Index++;
                break;
              case 123: case 125: case 91: case 93: case 58: case 44:
                // Parse a punctuator token (`{`, `}`, `[`, `]`, `:`, or `,`) at
                // the current position.
                value = charIndexBuggy ? source.charAt(Index) : source[Index];
                Index++;
                return value;
              case 34:
                // `"` delimits a JSON string; advance to the next character and
                // begin parsing the string. String tokens are prefixed with the
                // sentinel `@` character to distinguish them from punctuators and
                // end-of-string tokens.
                for (value = "@", Index++; Index < length;) {
                  charCode = source.charCodeAt(Index);
                  if (charCode < 32) {
                    // Unescaped ASCII control characters (those with a code unit
                    // less than the space character) are not permitted.
                    abort();
                  } else if (charCode == 92) {
                    // A reverse solidus (`\`) marks the beginning of an escaped
                    // control character (including `"`, `\`, and `/`) or Unicode
                    // escape sequence.
                    charCode = source.charCodeAt(++Index);
                    switch (charCode) {
                      case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
                        // Revive escaped control characters.
                        value += Unescapes[charCode];
                        Index++;
                        break;
                      case 117:
                        // `\u` marks the beginning of a Unicode escape sequence.
                        // Advance to the first character and validate the
                        // four-digit code point.
                        begin = ++Index;
                        for (position = Index + 4; Index < position; Index++) {
                          charCode = source.charCodeAt(Index);
                          // A valid sequence comprises four hexdigits (case-
                          // insensitive) that form a single hexadecimal value.
                          if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
                            // Invalid Unicode escape sequence.
                            abort();
                          }
                        }
                        // Revive the escaped character.
                        value += fromCharCode("0x" + source.slice(begin, Index));
                        break;
                      default:
                        // Invalid escape sequence.
                        abort();
                    }
                  } else {
                    if (charCode == 34) {
                      // An unescaped double-quote character marks the end of the
                      // string.
                      break;
                    }
                    charCode = source.charCodeAt(Index);
                    begin = Index;
                    // Optimize for the common case where a string is valid.
                    while (charCode >= 32 && charCode != 92 && charCode != 34) {
                      charCode = source.charCodeAt(++Index);
                    }
                    // Append the string as-is.
                    value += source.slice(begin, Index);
                  }
                }
                if (source.charCodeAt(Index) == 34) {
                  // Advance to the next character and return the revived string.
                  Index++;
                  return value;
                }
                // Unterminated string.
                abort();
              default:
                // Parse numbers and literals.
                begin = Index;
                // Advance past the negative sign, if one is specified.
                if (charCode == 45) {
                  isSigned = true;
                  charCode = source.charCodeAt(++Index);
                }
                // Parse an integer or floating-point value.
                if (charCode >= 48 && charCode <= 57) {
                  // Leading zeroes are interpreted as octal literals.
                  if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
                    // Illegal octal literal.
                    abort();
                  }
                  isSigned = false;
                  // Parse the integer component.
                  for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
                  // Floats cannot contain a leading decimal point; however, this
                  // case is already accounted for by the parser.
                  if (source.charCodeAt(Index) == 46) {
                    position = ++Index;
                    // Parse the decimal component.
                    for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal trailing decimal.
                      abort();
                    }
                    Index = position;
                  }
                  // Parse exponents. The `e` denoting the exponent is
                  // case-insensitive.
                  charCode = source.charCodeAt(Index);
                  if (charCode == 101 || charCode == 69) {
                    charCode = source.charCodeAt(++Index);
                    // Skip past the sign following the exponent, if one is
                    // specified.
                    if (charCode == 43 || charCode == 45) {
                      Index++;
                    }
                    // Parse the exponential component.
                    for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal empty exponent.
                      abort();
                    }
                    Index = position;
                  }
                  // Coerce the parsed value to a JavaScript number.
                  return +source.slice(begin, Index);
                }
                // A negative sign may only precede numbers.
                if (isSigned) {
                  abort();
                }
                // `true`, `false`, and `null` literals.
                if (source.slice(Index, Index + 4) == "true") {
                  Index += 4;
                  return true;
                } else if (source.slice(Index, Index + 5) == "false") {
                  Index += 5;
                  return false;
                } else if (source.slice(Index, Index + 4) == "null") {
                  Index += 4;
                  return null;
                }
                // Unrecognized token.
                abort();
            }
          }
          // Return the sentinel `$` character if the parser has reached the end
          // of the source string.
          return "$";
        };

        // Internal: Parses a JSON `value` token.
        var get = function (value) {
          var results, hasMembers;
          if (value == "$") {
            // Unexpected end of input.
            abort();
          }
          if (typeof value == "string") {
            if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
              // Remove the sentinel `@` character.
              return value.slice(1);
            }
            // Parse object and array literals.
            if (value == "[") {
              // Parses a JSON array, returning a new JavaScript array.
              results = [];
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing square bracket marks the end of the array literal.
                if (value == "]") {
                  break;
                }
                // If the array literal contains elements, the current token
                // should be a comma separating the previous element from the
                // next.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "]") {
                      // Unexpected trailing `,` in array literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each array element.
                    abort();
                  }
                }
                // Elisions and leading commas are not permitted.
                if (value == ",") {
                  abort();
                }
                results.push(get(value));
              }
              return results;
            } else if (value == "{") {
              // Parses a JSON object, returning a new JavaScript object.
              results = {};
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing curly brace marks the end of the object literal.
                if (value == "}") {
                  break;
                }
                // If the object literal contains members, the current token
                // should be a comma separator.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "}") {
                      // Unexpected trailing `,` in object literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each object member.
                    abort();
                  }
                }
                // Leading commas are not permitted, object property names must be
                // double-quoted strings, and a `:` must separate each property
                // name and value.
                if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex() != ":") {
                  abort();
                }
                results[value.slice(1)] = get(lex());
              }
              return results;
            }
            // Unexpected token encountered.
            abort();
          }
          return value;
        };

        // Internal: Updates a traversed object member.
        var update = function (source, property, callback) {
          var element = walk(source, property, callback);
          if (element === undef) {
            delete source[property];
          } else {
            source[property] = element;
          }
        };

        // Internal: Recursively traverses a parsed JSON object, invoking the
        // `callback` function for each value. This is an implementation of the
        // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
        var walk = function (source, property, callback) {
          var value = source[property], length;
          if (typeof value == "object" && value) {
            // `forEach` can't be used to traverse an array in Opera <= 8.54
            // because its `Object#hasOwnProperty` implementation returns `false`
            // for array indices (e.g., `![1, 2, 3].hasOwnProperty("0")`).
            if (getClass.call(value) == arrayClass) {
              for (length = value.length; length--;) {
                update(value, length, callback);
              }
            } else {
              forEach(value, function (property) {
                update(value, property, callback);
              });
            }
          }
          return callback.call(source, property, value);
        };

        // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
        exports.parse = function (source, callback) {
          var result, value;
          Index = 0;
          Source = "" + source;
          result = get(lex());
          // If a JSON string contains multiple tokens, it is invalid.
          if (lex() != "$") {
            abort();
          }
          // Reset the parser state.
          Index = Source = null;
          return callback && getClass.call(callback) == functionClass ? walk((value = {}, value[""] = result, value), "", callback) : result;
        };
      }
    }

    exports["runInContext"] = runInContext;
    return exports;
  }

  if (freeExports && !isLoader) {
    // Export for CommonJS environments.
    runInContext(root, freeExports);
  } else {
    // Export for web browsers and JavaScript engines.
    var nativeJSON = root.JSON,
        previousJSON = root["JSON3"],
        isRestored = false;

    var JSON3 = runInContext(root, (root["JSON3"] = {
      // Public: Restores the original value of the global `JSON` object and
      // returns a reference to the `JSON3` object.
      "noConflict": function () {
        if (!isRestored) {
          isRestored = true;
          root.JSON = nativeJSON;
          root["JSON3"] = previousJSON;
          nativeJSON = previousJSON = null;
        }
        return JSON3;
      }
    }));

    root.JSON = {
      "parse": JSON3.parse,
      "stringify": JSON3.stringify
    };
  }

  // Export for asynchronous module loaders.
  if (isLoader) {
    define(function () {
      return JSON3;
    });
  }
}).call(this);
}());

;(function() {
window.     vlSchema = {
  "oneOf": [
    {
      "$ref": "#/definitions/ExtendedUnitSpec",
      "description": "Schema for a unit Vega-Lite specification, with the syntactic sugar extensions:\n\n- `row` and `column` are included in the encoding.\n\n- (Future) label, box plot\n\n\n\nNote: the spec could contain facet."
    },
    {
      "$ref": "#/definitions/FacetSpec"
    },
    {
      "$ref": "#/definitions/LayerSpec"
    }
  ],
  "definitions": {
    "ExtendedUnitSpec": {
      "type": "object",
      "properties": {
        "mark": {
          "$ref": "#/definitions/Mark",
          "description": "The mark type.\n\nOne of `\"bar\"`, `\"circle\"`, `\"square\"`, `\"tick\"`, `\"line\"`,\n\n`\"area\"`, `\"point\"`, `\"rule\"`, and `\"text\"`."
        },
        "encoding": {
          "$ref": "#/definitions/Encoding",
          "description": "A key-value mapping between encoding channels and definition of fields."
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "mark"
      ]
    },
    "Mark": {
      "type": "string",
      "enum": [
        "area",
        "bar",
        "line",
        "point",
        "text",
        "tick",
        "rule",
        "circle",
        "square",
        "errorBar"
      ]
    },
    "Encoding": {
      "type": "object",
      "properties": {
        "row": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Vertical facets for trellis plots."
        },
        "column": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Horizontal facets for trellis plots."
        },
        "x": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "y": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "x2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "y2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "color": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Color of the marks – either fill or stroke color based on mark type.\n\n(By default, fill color for `area`, `bar`, `tick`, `text`, `circle`, and `square` /\n\nstroke color for `line` and `point`.)"
        },
        "opacity": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Opacity of the marks – either can be a value or in a range."
        },
        "size": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Size of the mark.\n\n- For `point`, `square` and `circle`\n\n– the symbol size, or pixel area of the mark.\n\n- For `bar` and `tick` – the bar and tick's size.\n\n- For `text` – the text's font size.\n\n- Size is currently unsupported for `line` and `area`."
        },
        "shape": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "The symbol's shape (only for `point` marks). The supported values are\n\n`\"circle\"` (default), `\"square\"`, `\"cross\"`, `\"diamond\"`, `\"triangle-up\"`,\n\nor `\"triangle-down\"`, or else a custom SVG path string."
        },
        "detail": {
          "description": "Additional levels of detail for grouping data in aggregate views and\n\nin line and area marks without mapping data to a specific visual channel.",
          "oneOf": [
            {
              "$ref": "#/definitions/FieldDef",
              "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/FieldDef",
                "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
              }
            }
          ]
        },
        "text": {
          "$ref": "#/definitions/FieldDef",
          "description": "Text of the `text` mark."
        },
        "label": {
          "$ref": "#/definitions/FieldDef"
        },
        "path": {
          "description": "Order of data points in line marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        },
        "order": {
          "description": "Layer order for non-stacked marks, or stack order for stacked marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        }
      }
    },
    "PositionChannelDef": {
      "type": "object",
      "properties": {
        "axis": {
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Axis"
            }
          ]
        },
        "scale": {
          "$ref": "#/definitions/Scale"
        },
        "sort": {
          "oneOf": [
            {
              "$ref": "#/definitions/SortField"
            },
            {
              "$ref": "#/definitions/SortOrder"
            }
          ]
        },
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "Axis": {
      "type": "object",
      "properties": {
        "labelAngle": {
          "description": "The rotation angle of the axis labels.",
          "type": "number"
        },
        "format": {
          "description": "The formatting pattern for axis labels.",
          "type": "string"
        },
        "orient": {
          "$ref": "#/definitions/AxisOrient",
          "description": "The orientation of the axis. One of top, bottom, left or right. The orientation can be used to further specialize the axis type (e.g., a y axis oriented for the right edge of the chart)."
        },
        "title": {
          "description": "A title for the axis. Shows field name and its function by default.",
          "type": "string"
        },
        "values": {
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "axisWidth": {
          "description": "Width of the axis line",
          "type": "number"
        },
        "layer": {
          "description": "A string indicating if the axis (and any gridlines) should be placed above or below the data marks.",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the axis from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "axisColor": {
          "description": "Color of axis line.",
          "type": "string"
        },
        "grid": {
          "description": "A flag indicate if gridlines should be created in addition to ticks. If `grid` is unspecified, the default value is `true` for ROW and COL. For X and Y, the default value is `true` for quantitative and time fields and `false` otherwise.",
          "type": "boolean"
        },
        "gridColor": {
          "description": "Color of gridlines.",
          "type": "string"
        },
        "gridDash": {
          "description": "The offset (in pixels) into which to begin drawing with the grid dash array.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "gridOpacity": {
          "description": "The stroke opacity of grid (value between [0,1])",
          "type": "number"
        },
        "gridWidth": {
          "description": "The grid width, in pixels.",
          "type": "number"
        },
        "labels": {
          "description": "Enable or disable labels.",
          "type": "boolean"
        },
        "labelAlign": {
          "description": "Text alignment for the Label.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "Text baseline for the label.",
          "type": "string"
        },
        "labelMaxLength": {
          "description": "Truncate labels that are too long.",
          "minimum": 1,
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month and day names should be abbreviated.",
          "type": "boolean"
        },
        "subdivide": {
          "description": "If provided, sets the number of minor ticks between major ticks (the value 9 results in decimal subdivision). Only applicable for axes visualizing quantitative scales.",
          "type": "number"
        },
        "ticks": {
          "description": "A desired number of ticks, for axes visualizing quantitative scales. The resulting number may be different so that values are \"nice\" (multiples of 2, 5, 10) and lie within the underlying scale's range.",
          "minimum": 0,
          "type": "number"
        },
        "tickColor": {
          "description": "The color of the axis's tick.",
          "type": "string"
        },
        "tickLabelColor": {
          "description": "The color of the tick label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "tickLabelFont": {
          "description": "The font of the tick label.",
          "type": "string"
        },
        "tickLabelFontSize": {
          "description": "The font size of label, in pixels.",
          "type": "number"
        },
        "tickPadding": {
          "description": "The padding, in pixels, between ticks and text labels.",
          "type": "number"
        },
        "tickSize": {
          "description": "The size, in pixels, of major, minor and end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMajor": {
          "description": "The size, in pixels, of major ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMinor": {
          "description": "The size, in pixels, of minor ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeEnd": {
          "description": "The size, in pixels, of end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickWidth": {
          "description": "The width, in pixels, of ticks.",
          "type": "number"
        },
        "titleColor": {
          "description": "Color of the title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "Font of the title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "Size of the title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "Weight of the title.",
          "type": "string"
        },
        "titleOffset": {
          "description": "A title offset value for the axis.",
          "type": "number"
        },
        "titleMaxLength": {
          "description": "Max length for axis title if the title is automatically generated from the field's description. By default, this is automatically based on cell size and characterWidth property.",
          "minimum": 0,
          "type": "number"
        },
        "characterWidth": {
          "description": "Character width for automatically determining title max length.",
          "type": "number"
        },
        "properties": {
          "description": "Optional mark property definitions for custom axis styling."
        }
      }
    },
    "AxisOrient": {
      "type": "string",
      "enum": [
        "top",
        "right",
        "left",
        "bottom"
      ]
    },
    "Scale": {
      "type": "object",
      "properties": {
        "type": {
          "$ref": "#/definitions/ScaleType"
        },
        "domain": {
          "description": "The domain of the scale, representing the set of data values. For quantitative data, this can take the form of a two-element array with minimum and maximum values. For ordinal/categorical data, this may be an array of valid input values.",
          "oneOf": [
            {
              "type": "array",
              "items": {
                "type": "number"
              }
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "range": {
          "description": "The range of the scale, representing the set of visual values. For numeric values, the range can take the form of a two-element array with minimum and maximum values. For ordinal or quantized data, the range may by an array of desired output values, which are mapped to elements in the specified domain. For ordinal scales only, the range can be defined using a DataRef: the range values are then drawn dynamically from a backing data set.",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "number"
              }
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "round": {
          "description": "If true, rounds numeric output values to integers. This can be helpful for snapping to the pixel grid.",
          "type": "boolean"
        },
        "bandSize": {
          "minimum": 0,
          "type": "number"
        },
        "padding": {
          "description": "Applies spacing among ordinal elements in the scale range. The actual effect depends on how the scale is configured. If the __points__ parameter is `true`, the padding value is interpreted as a multiple of the spacing between points. A reasonable value is 1.0, such that the first and last point will be offset from the minimum and maximum value by half the distance between points. Otherwise, padding is typically in the range [0, 1] and corresponds to the fraction of space in the range interval to allocate to padding. A value of 0.5 means that the range band width will be equal to the padding width. For more, see the [D3 ordinal scale documentation](https://github.com/mbostock/d3/wiki/Ordinal-Scales).",
          "type": "number"
        },
        "clamp": {
          "description": "If true, values that exceed the data domain are clamped to either the minimum or maximum range value",
          "type": "boolean"
        },
        "nice": {
          "description": "If specified, modifies the scale domain to use a more human-friendly value range. If specified as a true boolean, modifies the scale domain to use a more human-friendly number range (e.g., 7 instead of 6.96). If specified as a string, modifies the scale domain to use a more human-friendly value range. For time and utc scale types only, the nice value should be a string indicating the desired time interval.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/NiceTime"
            }
          ]
        },
        "exponent": {
          "description": "Sets the exponent of the scale transformation. For pow scale types only, otherwise ignored.",
          "type": "number"
        },
        "zero": {
          "description": "If `true`, ensures that a zero baseline value is included in the scale domain.\n\nDefault value: `true` for `x` and `y` channel if the quantitative field is not binned\n\nand no custom `domain` is provided; `false` otherwise.",
          "type": "boolean"
        },
        "useRawDomain": {
          "description": "Uses the source data range as scale domain instead of aggregated data for aggregate axis.\n\nThis property only works with aggregate functions that produce values within the raw data domain (`\"mean\"`, `\"average\"`, `\"stdev\"`, `\"stdevp\"`, `\"median\"`, `\"q1\"`, `\"q3\"`, `\"min\"`, `\"max\"`). For other aggregations that produce values outside of the raw data domain (e.g. `\"count\"`, `\"sum\"`), this property is ignored.",
          "type": "boolean"
        }
      }
    },
    "ScaleType": {
      "type": "string",
      "enum": [
        "linear",
        "log",
        "pow",
        "sqrt",
        "quantile",
        "quantize",
        "ordinal",
        "time",
        "utc"
      ]
    },
    "NiceTime": {
      "type": "string",
      "enum": [
        "second",
        "minute",
        "hour",
        "day",
        "week",
        "month",
        "year"
      ]
    },
    "SortField": {
      "type": "object",
      "properties": {
        "field": {
          "description": "The field name to aggregate over.",
          "type": "string"
        },
        "op": {
          "$ref": "#/definitions/AggregateOp",
          "description": "The sort aggregation operator"
        },
        "order": {
          "$ref": "#/definitions/SortOrder"
        }
      },
      "required": [
        "field",
        "op"
      ]
    },
    "AggregateOp": {
      "type": "string",
      "enum": [
        "values",
        "count",
        "valid",
        "missing",
        "distinct",
        "sum",
        "mean",
        "average",
        "variance",
        "variancep",
        "stdev",
        "stdevp",
        "median",
        "q1",
        "q3",
        "modeskew",
        "min",
        "max",
        "argmin",
        "argmax"
      ]
    },
    "SortOrder": {
      "type": "string",
      "enum": [
        "ascending",
        "descending",
        "none"
      ]
    },
    "Type": {
      "type": "string",
      "enum": [
        "quantitative",
        "ordinal",
        "temporal",
        "nominal"
      ]
    },
    "TimeUnit": {
      "type": "string",
      "enum": [
        "year",
        "month",
        "day",
        "date",
        "hours",
        "minutes",
        "seconds",
        "milliseconds",
        "yearmonth",
        "yearmonthdate",
        "yearmonthdatehours",
        "yearmonthdatehoursminutes",
        "yearmonthdatehoursminutesseconds",
        "hoursminutes",
        "hoursminutesseconds",
        "minutesseconds",
        "secondsmilliseconds",
        "quarter",
        "yearquarter",
        "quartermonth",
        "yearquartermonth"
      ]
    },
    "Bin": {
      "type": "object",
      "properties": {
        "min": {
          "description": "The minimum bin value to consider. If unspecified, the minimum value of the specified field is used.",
          "type": "number"
        },
        "max": {
          "description": "The maximum bin value to consider. If unspecified, the maximum value of the specified field is used.",
          "type": "number"
        },
        "base": {
          "description": "The number base to use for automatic bin determination (default is base 10).",
          "type": "number"
        },
        "step": {
          "description": "An exact step size to use between bins. If provided, options such as maxbins will be ignored.",
          "type": "number"
        },
        "steps": {
          "description": "An array of allowable step sizes to choose from.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "minstep": {
          "description": "A minimum allowable step size (particularly useful for integer values).",
          "type": "number"
        },
        "div": {
          "description": "Scale factors indicating allowable subdivisions. The default value is [5, 2], which indicates that for base 10 numbers (the default base), the method may consider dividing bin sizes by 5 and/or 2. For example, for an initial step size of 10, the method can check if bin sizes of 2 (= 10/5), 5 (= 10/2), or 1 (= 10/(5*2)) might also satisfy the given constraints.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "maxbins": {
          "description": "Maximum number of bins.",
          "minimum": 2,
          "type": "number"
        }
      }
    },
    "ChannelDefWithLegend": {
      "type": "object",
      "properties": {
        "legend": {
          "$ref": "#/definitions/Legend"
        },
        "scale": {
          "$ref": "#/definitions/Scale"
        },
        "sort": {
          "oneOf": [
            {
              "$ref": "#/definitions/SortField"
            },
            {
              "$ref": "#/definitions/SortOrder"
            }
          ]
        },
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "Legend": {
      "type": "object",
      "properties": {
        "format": {
          "description": "An optional formatting pattern for legend labels. Vega uses D3\\'s format pattern.",
          "type": "string"
        },
        "title": {
          "description": "A title for the legend. (Shows field name and its function by default.)",
          "type": "string"
        },
        "values": {
          "description": "Explicitly set the visible legend values.",
          "type": "array",
          "items": {}
        },
        "orient": {
          "description": "The orientation of the legend. One of \"left\" or \"right\". This determines how the legend is positioned within the scene. The default is \"right\".",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the legend from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "padding": {
          "description": "The padding, in pixels, between the lengend and axis.",
          "type": "number"
        },
        "margin": {
          "description": "The margin around the legend, in pixels",
          "type": "number"
        },
        "gradientStrokeColor": {
          "description": "The color of the gradient stroke, can be in hex color code or regular color name.",
          "type": "string"
        },
        "gradientStrokeWidth": {
          "description": "The width of the gradient stroke, in pixels.",
          "type": "number"
        },
        "gradientHeight": {
          "description": "The height of the gradient, in pixels.",
          "type": "number"
        },
        "gradientWidth": {
          "description": "The width of the gradient, in pixels.",
          "type": "number"
        },
        "labelAlign": {
          "description": "The alignment of the legend label, can be left, middle or right.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "The position of the baseline of legend label, can be top, middle or bottom.",
          "type": "string"
        },
        "labelColor": {
          "description": "The color of the legend label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "labelFont": {
          "description": "The font of the lengend label.",
          "type": "string"
        },
        "labelFontSize": {
          "description": "The font size of lengend lable.",
          "type": "number"
        },
        "labelOffset": {
          "description": "The offset of the legend label.",
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month names and weekday names should be abbreviated.",
          "type": "boolean"
        },
        "symbolColor": {
          "description": "The color of the legend symbol,",
          "type": "string"
        },
        "symbolShape": {
          "description": "The shape of the legend symbol, can be the 'circle', 'square', 'cross', 'diamond',\n\n'triangle-up', 'triangle-down', or else a custom SVG path string.",
          "type": "string"
        },
        "symbolSize": {
          "description": "The size of the lengend symbol, in pixels.",
          "type": "number"
        },
        "symbolStrokeWidth": {
          "description": "The width of the symbol's stroke.",
          "type": "number"
        },
        "titleColor": {
          "description": "Optional mark property definitions for custom legend styling.\n\nThe color of the legend title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "The font of the legend title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "The font size of the legend title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "The font weight of the legend title.",
          "type": "string"
        },
        "properties": {
          "description": "Optional mark property definitions for custom legend styling."
        }
      }
    },
    "FieldDef": {
      "type": "object",
      "properties": {
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "OrderChannelDef": {
      "type": "object",
      "properties": {
        "sort": {
          "$ref": "#/definitions/SortOrder"
        },
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "Data": {
      "type": "object",
      "properties": {
        "format": {
          "$ref": "#/definitions/DataFormat",
          "description": "An object that specifies the format for the data file or values."
        },
        "url": {
          "description": "A URL from which to load the data set. Use the format.type property\n\nto ensure the loaded data is correctly parsed.",
          "type": "string"
        },
        "values": {
          "description": "Pass array of objects instead of a url to a file.",
          "type": "array",
          "items": {}
        }
      }
    },
    "DataFormat": {
      "type": "object",
      "properties": {
        "type": {
          "$ref": "#/definitions/DataFormatType",
          "description": "Type of input data: `\"json\"`, `\"csv\"`, `\"tsv\"`.\n\nThe default format type is determined by the extension of the file url.\n\nIf no extension is detected, `\"json\"` will be used by default."
        },
        "property": {
          "description": "JSON only) The JSON property containing the desired data.\n\nThis parameter can be used when the loaded JSON file may have surrounding structure or meta-data.\n\nFor example `\"property\": \"values.features\"` is equivalent to retrieving `json.values.features`\n\nfrom the loaded JSON object.",
          "type": "string"
        },
        "feature": {
          "description": "The name of the TopoJSON object set to convert to a GeoJSON feature collection.\n\nFor example, in a map of the world, there may be an object set named `\"countries\"`.\n\nUsing the feature property, we can extract this set and generate a GeoJSON feature object for each country.",
          "type": "string"
        },
        "mesh": {
          "description": "The name of the TopoJSON object set to convert to a mesh.\n\nSimilar to the `feature` option, `mesh` extracts a named TopoJSON object set.\n\nUnlike the `feature` option, the corresponding geo data is returned as a single, unified mesh instance, not as inidividual GeoJSON features.\n\nExtracting a mesh is useful for more efficiently drawing borders or other geographic elements that you do not need to associate with specific regions such as individual countries, states or counties.",
          "type": "string"
        }
      }
    },
    "DataFormatType": {
      "type": "string",
      "enum": [
        "json",
        "csv",
        "tsv",
        "topojson"
      ]
    },
    "Transform": {
      "type": "object",
      "properties": {
        "filter": {
          "description": "A string containing the filter Vega expression. Use `datum` to refer to the current data object.",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "$ref": "#/definitions/EqualFilter"
            },
            {
              "$ref": "#/definitions/RangeFilter"
            },
            {
              "$ref": "#/definitions/InFilter"
            },
            {
              "type": "array",
              "items": {
                "oneOf": [
                  {
                    "type": "string"
                  },
                  {
                    "$ref": "#/definitions/EqualFilter"
                  },
                  {
                    "$ref": "#/definitions/RangeFilter"
                  },
                  {
                    "$ref": "#/definitions/InFilter"
                  }
                ]
              }
            }
          ]
        },
        "filterInvalid": {
          "description": "Whether to filter invalid values (`null` and `NaN`) from the data. By default (`undefined`), only quantitative and temporal fields are filtered. If set to `true`, all data items with null values are filtered. If `false`, all data items are included.",
          "type": "boolean"
        },
        "calculate": {
          "description": "Calculate new field(s) using the provided expresssion(s). Calculation are applied before filter.",
          "type": "array",
          "items": {
            "$ref": "#/definitions/Formula",
            "description": "Formula object for calculate."
          }
        }
      }
    },
    "EqualFilter": {
      "type": "object",
      "properties": {
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for the field to be filtered."
        },
        "field": {
          "description": "Field to be filtered.",
          "type": "string"
        },
        "equal": {
          "description": "Value that the field should be equal to.",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "number"
            },
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/DateTime",
              "description": "Object for defining datetime in Vega-Lite Filter.\n\nIf both month and quarter are provided, month has higher precedence.\n\n`day` cannot be combined with other date.\n\nWe accept string for month and day names."
            }
          ]
        }
      },
      "required": [
        "field",
        "equal"
      ]
    },
    "DateTime": {
      "type": "object",
      "properties": {
        "year": {
          "description": "Integer value representing the year.",
          "type": "number"
        },
        "quarter": {
          "description": "Integer value representing the quarter of the year (from 1-4).",
          "type": "number"
        },
        "month": {
          "description": "One of: (1) integer value representing the month from `1`-`12`. `1` represents January;  (2) case-insensitive month name (e.g., `\"January\"`);  (3) case-insensitive, 3-character short month name (e.g., `\"Jan\"`).",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            }
          ]
        },
        "date": {
          "description": "Integer value representing the date from 1-31.",
          "type": "number"
        },
        "day": {
          "description": "Value representing the day of week.  This can be one of: (1) integer value -- `1` represents Monday; (2) case-insensitive day name (e.g., `\"Monday\"`);  (3) case-insensitive, 3-character short day name (e.g., `\"Mon\"`).   <br/> **Warning:** A DateTime definition object with `day`** should not be combined with `year`, `quarter`, `month`, or `date`.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            }
          ]
        },
        "hours": {
          "description": "Integer value representing the hour of day from 0-23.",
          "type": "number"
        },
        "minutes": {
          "description": "Integer value representing minute segment of a time from 0-59.",
          "type": "number"
        },
        "seconds": {
          "description": "Integer value representing second segment of a time from 0-59.",
          "type": "number"
        },
        "milliseconds": {
          "description": "Integer value representing millisecond segment of a time.",
          "type": "number"
        }
      }
    },
    "RangeFilter": {
      "type": "object",
      "properties": {
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "time unit for the field to be filtered."
        },
        "field": {
          "description": "Field to be filtered",
          "type": "string"
        },
        "range": {
          "description": "Array of inclusive minimum and maximum values\n\nfor a field value of a data item to be included in the filtered data.",
          "maxItems": 2,
          "minItems": 2,
          "type": "array",
          "items": {
            "oneOf": [
              {
                "type": "number"
              },
              {
                "$ref": "#/definitions/DateTime",
                "description": "Object for defining datetime in Vega-Lite Filter.\n\nIf both month and quarter are provided, month has higher precedence.\n\n`day` cannot be combined with other date.\n\nWe accept string for month and day names."
              }
            ]
          }
        }
      },
      "required": [
        "field",
        "range"
      ]
    },
    "InFilter": {
      "type": "object",
      "properties": {
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "time unit for the field to be filtered."
        },
        "field": {
          "description": "Field to be filtered",
          "type": "string"
        },
        "in": {
          "description": "A set of values that the `field`'s value should be a member of,\n\nfor a data item included in the filtered data.",
          "type": "array",
          "items": {
            "oneOf": [
              {
                "type": "string"
              },
              {
                "type": "number"
              },
              {
                "type": "boolean"
              },
              {
                "$ref": "#/definitions/DateTime",
                "description": "Object for defining datetime in Vega-Lite Filter.\n\nIf both month and quarter are provided, month has higher precedence.\n\n`day` cannot be combined with other date.\n\nWe accept string for month and day names."
              }
            ]
          }
        }
      },
      "required": [
        "field",
        "in"
      ]
    },
    "Formula": {
      "type": "object",
      "properties": {
        "field": {
          "description": "The field in which to store the computed formula value.",
          "type": "string"
        },
        "expr": {
          "description": "A string containing an expression for the formula. Use the variable `datum` to to refer to the current data object.",
          "type": "string"
        }
      },
      "required": [
        "field",
        "expr"
      ]
    },
    "Config": {
      "type": "object",
      "properties": {
        "viewport": {
          "description": "The width and height of the on-screen viewport, in pixels. If necessary, clipping and scrolling will be applied.",
          "type": "number"
        },
        "background": {
          "description": "CSS color property to use as background of visualization. Default is `\"transparent\"`.",
          "type": "string"
        },
        "numberFormat": {
          "description": "D3 Number format for axis labels and text tables. For example \"s\" for SI units.",
          "type": "string"
        },
        "timeFormat": {
          "description": "Default datetime format for axis and legend labels. The format can be set directly on each axis and legend.",
          "type": "string"
        },
        "countTitle": {
          "description": "Default axis and legend title for count fields.",
          "type": "string"
        },
        "cell": {
          "$ref": "#/definitions/CellConfig",
          "description": "Cell Config"
        },
        "mark": {
          "$ref": "#/definitions/MarkConfig",
          "description": "Mark Config"
        },
        "overlay": {
          "$ref": "#/definitions/OverlayConfig",
          "description": "Mark Overlay Config"
        },
        "scale": {
          "$ref": "#/definitions/ScaleConfig",
          "description": "Scale Config"
        },
        "axis": {
          "$ref": "#/definitions/AxisConfig",
          "description": "Axis Config"
        },
        "legend": {
          "$ref": "#/definitions/LegendConfig",
          "description": "Legend Config"
        },
        "facet": {
          "$ref": "#/definitions/FacetConfig",
          "description": "Facet Config"
        }
      }
    },
    "CellConfig": {
      "type": "object",
      "properties": {
        "width": {
          "type": "number"
        },
        "height": {
          "type": "number"
        },
        "clip": {
          "type": "boolean"
        },
        "fill": {
          "description": "The fill color.",
          "format": "color",
          "type": "string"
        },
        "fillOpacity": {
          "description": "The fill opacity (value between [0,1]).",
          "type": "number"
        },
        "stroke": {
          "description": "The stroke color.",
          "type": "string"
        },
        "strokeOpacity": {
          "description": "The stroke opacity (value between [0,1]).",
          "type": "number"
        },
        "strokeWidth": {
          "description": "The stroke width, in pixels.",
          "type": "number"
        },
        "strokeDash": {
          "description": "An array of alternating stroke, space lengths for creating dashed or dotted lines.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "strokeDashOffset": {
          "description": "The offset (in pixels) into which to begin drawing with the stroke dash array.",
          "type": "number"
        }
      }
    },
    "MarkConfig": {
      "type": "object",
      "properties": {
        "filled": {
          "description": "Whether the shape\\'s color should be used as fill color instead of stroke color.\n\nThis is only applicable for \"bar\", \"point\", and \"area\".\n\nAll marks except \"point\" marks are filled by default.\n\nSee Mark Documentation (http://vega.github.io/vega-lite/docs/marks.html)\n\nfor usage example.",
          "type": "boolean"
        },
        "color": {
          "description": "Default color.",
          "format": "color",
          "type": "string"
        },
        "fill": {
          "description": "Default Fill Color.  This has higher precedence than config.color",
          "format": "color",
          "type": "string"
        },
        "stroke": {
          "description": "Default Stroke Color.  This has higher precedence than config.color",
          "format": "color",
          "type": "string"
        },
        "opacity": {
          "minimum": 0,
          "maximum": 1,
          "type": "number"
        },
        "fillOpacity": {
          "minimum": 0,
          "maximum": 1,
          "type": "number"
        },
        "strokeOpacity": {
          "minimum": 0,
          "maximum": 1,
          "type": "number"
        },
        "strokeWidth": {
          "minimum": 0,
          "type": "number"
        },
        "strokeDash": {
          "description": "An array of alternating stroke, space lengths for creating dashed or dotted lines.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "strokeDashOffset": {
          "description": "The offset (in pixels) into which to begin drawing with the stroke dash array.",
          "type": "number"
        },
        "stacked": {
          "$ref": "#/definitions/StackOffset"
        },
        "orient": {
          "$ref": "#/definitions/Orient",
          "description": "The orientation of a non-stacked bar, tick, area, and line charts.\n\nThe value is either horizontal (default) or vertical.\n\n- For bar, rule and tick, this determines whether the size of the bar and tick\n\nshould be applied to x or y dimension.\n\n- For area, this property determines the orient property of the Vega output.\n\n- For line, this property determines the sort order of the points in the line\n\nif `config.sortLineBy` is not specified.\n\nFor stacked charts, this is always determined by the orientation of the stack;\n\ntherefore explicitly specified value will be ignored."
        },
        "interpolate": {
          "$ref": "#/definitions/Interpolate",
          "description": "The line interpolation method to use. One of linear, step-before, step-after, basis, basis-open, cardinal, cardinal-open, monotone."
        },
        "tension": {
          "description": "Depending on the interpolation type, sets the tension parameter.",
          "type": "number"
        },
        "lineSize": {
          "description": "Size of line mark.",
          "type": "number"
        },
        "ruleSize": {
          "description": "Size of rule mark.",
          "type": "number"
        },
        "barSize": {
          "description": "The size of the bars.  If unspecified, the default size is  `bandSize-1`,\n\nwhich provides 1 pixel offset between bars.",
          "type": "number"
        },
        "barThinSize": {
          "description": "The size of the bars on continuous scales.",
          "type": "number"
        },
        "shape": {
          "description": "The symbol shape to use. One of circle (default), square, cross, diamond, triangle-up, or triangle-down, or a custom SVG path.",
          "oneOf": [
            {
              "$ref": "#/definitions/Shape"
            },
            {
              "type": "string"
            }
          ]
        },
        "size": {
          "description": "The pixel area each the point. For example: in the case of circles, the radius is determined in part by the square root of the size value.",
          "type": "number"
        },
        "tickSize": {
          "description": "The width of the ticks.",
          "type": "number"
        },
        "tickThickness": {
          "description": "Thickness of the tick mark.",
          "type": "number"
        },
        "align": {
          "$ref": "#/definitions/HorizontalAlign",
          "description": "The horizontal alignment of the text. One of left, right, center."
        },
        "angle": {
          "description": "The rotation angle of the text, in degrees.",
          "type": "number"
        },
        "baseline": {
          "$ref": "#/definitions/VerticalAlign",
          "description": "The vertical alignment of the text. One of top, middle, bottom."
        },
        "dx": {
          "description": "The horizontal offset, in pixels, between the text label and its anchor point. The offset is applied after rotation by the angle property.",
          "type": "number"
        },
        "dy": {
          "description": "The vertical offset, in pixels, between the text label and its anchor point. The offset is applied after rotation by the angle property.",
          "type": "number"
        },
        "radius": {
          "description": "Polar coordinate radial offset, in pixels, of the text label from the origin determined by the x and y properties.",
          "type": "number"
        },
        "theta": {
          "description": "Polar coordinate angle, in radians, of the text label from the origin determined by the x and y properties. Values for theta follow the same convention of arc mark startAngle and endAngle properties: angles are measured in radians, with 0 indicating \"north\".",
          "type": "number"
        },
        "font": {
          "description": "The typeface to set the text in (e.g., Helvetica Neue).",
          "type": "string"
        },
        "fontSize": {
          "description": "The font size, in pixels.",
          "type": "number"
        },
        "fontStyle": {
          "$ref": "#/definitions/FontStyle",
          "description": "The font style (e.g., italic)."
        },
        "fontWeight": {
          "$ref": "#/definitions/FontWeight",
          "description": "The font weight (e.g., bold)."
        },
        "format": {
          "description": "The formatting pattern for text value. If not defined, this will be determined automatically.",
          "type": "string"
        },
        "shortTimeLabels": {
          "description": "Whether month names and weekday names should be abbreviated.",
          "type": "boolean"
        },
        "text": {
          "description": "Placeholder Text",
          "type": "string"
        },
        "applyColorToBackground": {
          "description": "Apply color field to background color instead of the text.",
          "type": "boolean"
        }
      }
    },
    "StackOffset": {
      "type": "string",
      "enum": [
        "zero",
        "center",
        "normalize",
        "none"
      ]
    },
    "Orient": {
      "type": "string",
      "enum": [
        "horizontal",
        "vertical"
      ]
    },
    "Interpolate": {
      "type": "string",
      "enum": [
        "linear",
        "linear-closed",
        "step",
        "step-before",
        "step-after",
        "basis",
        "basis-open",
        "basis-closed",
        "cardinal",
        "cardinal-open",
        "cardinal-closed",
        "bundle",
        "monotone"
      ]
    },
    "Shape": {
      "type": "string",
      "enum": [
        "circle",
        "square",
        "cross",
        "diamond",
        "triangle-up",
        "triangle-down"
      ]
    },
    "HorizontalAlign": {
      "type": "string",
      "enum": [
        "left",
        "right",
        "center"
      ]
    },
    "VerticalAlign": {
      "type": "string",
      "enum": [
        "top",
        "middle",
        "bottom"
      ]
    },
    "FontStyle": {
      "type": "string",
      "enum": [
        "normal",
        "italic"
      ]
    },
    "FontWeight": {
      "type": "string",
      "enum": [
        "normal",
        "bold"
      ]
    },
    "OverlayConfig": {
      "type": "object",
      "properties": {
        "line": {
          "description": "Whether to overlay line with point.",
          "type": "boolean"
        },
        "area": {
          "$ref": "#/definitions/AreaOverlay",
          "description": "Type of overlay for area mark (line or linepoint)"
        },
        "pointStyle": {
          "$ref": "#/definitions/MarkConfig",
          "description": "Default style for the overlayed point."
        },
        "lineStyle": {
          "$ref": "#/definitions/MarkConfig",
          "description": "Default style for the overlayed point."
        }
      }
    },
    "AreaOverlay": {
      "type": "string",
      "enum": [
        "line",
        "linepoint",
        "none"
      ]
    },
    "ScaleConfig": {
      "type": "object",
      "properties": {
        "round": {
          "description": "If true, rounds numeric output values to integers.\n\nThis can be helpful for snapping to the pixel grid.\n\n(Only available for `x`, `y`, `size`, `row`, and `column` scales.)",
          "type": "boolean"
        },
        "textBandWidth": {
          "description": "Default band width for `x` ordinal scale when is mark is `text`.",
          "minimum": 0,
          "type": "number"
        },
        "bandSize": {
          "description": "Default band size for (1) `y` ordinal scale,\n\nand (2) `x` ordinal scale when the mark is not `text`.",
          "minimum": 0,
          "type": "number"
        },
        "opacity": {
          "description": "Default range for opacity.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "padding": {
          "description": "Default padding for `x` and `y` ordinal scales.",
          "type": "number"
        },
        "useRawDomain": {
          "description": "Uses the source data range as scale domain instead of aggregated data for aggregate axis.\n\nThis property only works with aggregate functions that produce values within the raw data domain (`\"mean\"`, `\"average\"`, `\"stdev\"`, `\"stdevp\"`, `\"median\"`, `\"q1\"`, `\"q3\"`, `\"min\"`, `\"max\"`). For other aggregations that produce values outside of the raw data domain (e.g. `\"count\"`, `\"sum\"`), this property is ignored.",
          "type": "boolean"
        },
        "nominalColorRange": {
          "description": "Default range for nominal color scale",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "sequentialColorRange": {
          "description": "Default range for ordinal / continuous color scale",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "shapeRange": {
          "description": "Default range for shape",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "barSizeRange": {
          "description": "Default range for bar size scale",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "fontSizeRange": {
          "description": "Default range for font size scale",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "ruleSizeRange": {
          "description": "Default range for rule stroke widths",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "tickSizeRange": {
          "description": "Default range for tick spans",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "pointSizeRange": {
          "description": "Default range for bar size scale",
          "type": "array",
          "items": {
            "type": "number"
          }
        }
      }
    },
    "AxisConfig": {
      "type": "object",
      "properties": {
        "axisWidth": {
          "description": "Width of the axis line",
          "type": "number"
        },
        "layer": {
          "description": "A string indicating if the axis (and any gridlines) should be placed above or below the data marks.",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the axis from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "axisColor": {
          "description": "Color of axis line.",
          "type": "string"
        },
        "grid": {
          "description": "A flag indicate if gridlines should be created in addition to ticks. If `grid` is unspecified, the default value is `true` for ROW and COL. For X and Y, the default value is `true` for quantitative and time fields and `false` otherwise.",
          "type": "boolean"
        },
        "gridColor": {
          "description": "Color of gridlines.",
          "type": "string"
        },
        "gridDash": {
          "description": "The offset (in pixels) into which to begin drawing with the grid dash array.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "gridOpacity": {
          "description": "The stroke opacity of grid (value between [0,1])",
          "type": "number"
        },
        "gridWidth": {
          "description": "The grid width, in pixels.",
          "type": "number"
        },
        "labels": {
          "description": "Enable or disable labels.",
          "type": "boolean"
        },
        "labelAngle": {
          "description": "The rotation angle of the axis labels.",
          "type": "number"
        },
        "labelAlign": {
          "description": "Text alignment for the Label.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "Text baseline for the label.",
          "type": "string"
        },
        "labelMaxLength": {
          "description": "Truncate labels that are too long.",
          "minimum": 1,
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month and day names should be abbreviated.",
          "type": "boolean"
        },
        "subdivide": {
          "description": "If provided, sets the number of minor ticks between major ticks (the value 9 results in decimal subdivision). Only applicable for axes visualizing quantitative scales.",
          "type": "number"
        },
        "ticks": {
          "description": "A desired number of ticks, for axes visualizing quantitative scales. The resulting number may be different so that values are \"nice\" (multiples of 2, 5, 10) and lie within the underlying scale's range.",
          "minimum": 0,
          "type": "number"
        },
        "tickColor": {
          "description": "The color of the axis's tick.",
          "type": "string"
        },
        "tickLabelColor": {
          "description": "The color of the tick label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "tickLabelFont": {
          "description": "The font of the tick label.",
          "type": "string"
        },
        "tickLabelFontSize": {
          "description": "The font size of label, in pixels.",
          "type": "number"
        },
        "tickPadding": {
          "description": "The padding, in pixels, between ticks and text labels.",
          "type": "number"
        },
        "tickSize": {
          "description": "The size, in pixels, of major, minor and end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMajor": {
          "description": "The size, in pixels, of major ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMinor": {
          "description": "The size, in pixels, of minor ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeEnd": {
          "description": "The size, in pixels, of end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickWidth": {
          "description": "The width, in pixels, of ticks.",
          "type": "number"
        },
        "titleColor": {
          "description": "Color of the title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "Font of the title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "Size of the title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "Weight of the title.",
          "type": "string"
        },
        "titleOffset": {
          "description": "A title offset value for the axis.",
          "type": "number"
        },
        "titleMaxLength": {
          "description": "Max length for axis title if the title is automatically generated from the field's description. By default, this is automatically based on cell size and characterWidth property.",
          "minimum": 0,
          "type": "number"
        },
        "characterWidth": {
          "description": "Character width for automatically determining title max length.",
          "type": "number"
        },
        "properties": {
          "description": "Optional mark property definitions for custom axis styling."
        }
      }
    },
    "LegendConfig": {
      "type": "object",
      "properties": {
        "orient": {
          "description": "The orientation of the legend. One of \"left\" or \"right\". This determines how the legend is positioned within the scene. The default is \"right\".",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the legend from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "padding": {
          "description": "The padding, in pixels, between the lengend and axis.",
          "type": "number"
        },
        "margin": {
          "description": "The margin around the legend, in pixels",
          "type": "number"
        },
        "gradientStrokeColor": {
          "description": "The color of the gradient stroke, can be in hex color code or regular color name.",
          "type": "string"
        },
        "gradientStrokeWidth": {
          "description": "The width of the gradient stroke, in pixels.",
          "type": "number"
        },
        "gradientHeight": {
          "description": "The height of the gradient, in pixels.",
          "type": "number"
        },
        "gradientWidth": {
          "description": "The width of the gradient, in pixels.",
          "type": "number"
        },
        "labelAlign": {
          "description": "The alignment of the legend label, can be left, middle or right.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "The position of the baseline of legend label, can be top, middle or bottom.",
          "type": "string"
        },
        "labelColor": {
          "description": "The color of the legend label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "labelFont": {
          "description": "The font of the lengend label.",
          "type": "string"
        },
        "labelFontSize": {
          "description": "The font size of lengend lable.",
          "type": "number"
        },
        "labelOffset": {
          "description": "The offset of the legend label.",
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month names and weekday names should be abbreviated.",
          "type": "boolean"
        },
        "symbolColor": {
          "description": "The color of the legend symbol,",
          "type": "string"
        },
        "symbolShape": {
          "description": "The shape of the legend symbol, can be the 'circle', 'square', 'cross', 'diamond',\n\n'triangle-up', 'triangle-down', or else a custom SVG path string.",
          "type": "string"
        },
        "symbolSize": {
          "description": "The size of the lengend symbol, in pixels.",
          "type": "number"
        },
        "symbolStrokeWidth": {
          "description": "The width of the symbol's stroke.",
          "type": "number"
        },
        "titleColor": {
          "description": "Optional mark property definitions for custom legend styling.\n\nThe color of the legend title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "The font of the legend title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "The font size of the legend title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "The font weight of the legend title.",
          "type": "string"
        },
        "properties": {
          "description": "Optional mark property definitions for custom legend styling."
        }
      }
    },
    "FacetConfig": {
      "type": "object",
      "properties": {
        "scale": {
          "$ref": "#/definitions/FacetScaleConfig",
          "description": "Facet Scale Config"
        },
        "axis": {
          "$ref": "#/definitions/AxisConfig",
          "description": "Facet Axis Config"
        },
        "grid": {
          "$ref": "#/definitions/FacetGridConfig",
          "description": "Facet Grid Config"
        },
        "cell": {
          "$ref": "#/definitions/CellConfig",
          "description": "Facet Cell Config"
        }
      }
    },
    "FacetScaleConfig": {
      "type": "object",
      "properties": {
        "round": {
          "type": "boolean"
        },
        "padding": {
          "type": "number"
        }
      }
    },
    "FacetGridConfig": {
      "type": "object",
      "properties": {
        "color": {
          "format": "color",
          "type": "string"
        },
        "opacity": {
          "type": "number"
        },
        "offset": {
          "type": "number"
        }
      }
    },
    "FacetSpec": {
      "type": "object",
      "properties": {
        "facet": {
          "$ref": "#/definitions/Facet"
        },
        "spec": {
          "oneOf": [
            {
              "$ref": "#/definitions/LayerSpec"
            },
            {
              "$ref": "#/definitions/UnitSpec"
            }
          ]
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "facet",
        "spec"
      ]
    },
    "Facet": {
      "type": "object",
      "properties": {
        "row": {
          "$ref": "#/definitions/PositionChannelDef"
        },
        "column": {
          "$ref": "#/definitions/PositionChannelDef"
        }
      }
    },
    "LayerSpec": {
      "type": "object",
      "properties": {
        "layers": {
          "description": "Unit specs that will be layered.",
          "type": "array",
          "items": {
            "$ref": "#/definitions/UnitSpec"
          }
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "layers"
      ]
    },
    "UnitSpec": {
      "type": "object",
      "properties": {
        "mark": {
          "$ref": "#/definitions/Mark",
          "description": "The mark type.\n\nOne of `\"bar\"`, `\"circle\"`, `\"square\"`, `\"tick\"`, `\"line\"`,\n\n`\"area\"`, `\"point\"`, `\"rule\"`, and `\"text\"`."
        },
        "encoding": {
          "$ref": "#/definitions/UnitEncoding",
          "description": "A key-value mapping between encoding channels and definition of fields."
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "mark"
      ]
    },
    "UnitEncoding": {
      "type": "object",
      "properties": {
        "x": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "y": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "x2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "y2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "color": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Color of the marks – either fill or stroke color based on mark type.\n\n(By default, fill color for `area`, `bar`, `tick`, `text`, `circle`, and `square` /\n\nstroke color for `line` and `point`.)"
        },
        "opacity": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Opacity of the marks – either can be a value or in a range."
        },
        "size": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Size of the mark.\n\n- For `point`, `square` and `circle`\n\n– the symbol size, or pixel area of the mark.\n\n- For `bar` and `tick` – the bar and tick's size.\n\n- For `text` – the text's font size.\n\n- Size is currently unsupported for `line` and `area`."
        },
        "shape": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "The symbol's shape (only for `point` marks). The supported values are\n\n`\"circle\"` (default), `\"square\"`, `\"cross\"`, `\"diamond\"`, `\"triangle-up\"`,\n\nor `\"triangle-down\"`, or else a custom SVG path string."
        },
        "detail": {
          "description": "Additional levels of detail for grouping data in aggregate views and\n\nin line and area marks without mapping data to a specific visual channel.",
          "oneOf": [
            {
              "$ref": "#/definitions/FieldDef",
              "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/FieldDef",
                "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
              }
            }
          ]
        },
        "text": {
          "$ref": "#/definitions/FieldDef",
          "description": "Text of the `text` mark."
        },
        "label": {
          "$ref": "#/definitions/FieldDef"
        },
        "path": {
          "description": "Order of data points in line marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        },
        "order": {
          "description": "Layer order for non-stacked marks, or stack order for stacked marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        }
      }
    }
  },
  "$schema": "http://json-schema.org/draft-04/schema#"
};
}());

;(function() {
'use strict';
/* globals window, angular */

angular.module('vlui', [
    'LocalStorageModule',
    'angular-google-analytics',
    'angular-sortable-view',
    'angular-websql'
  ])
  .constant('_', window._)
  // datalib, vegalite, vega
  .constant('vl', window.vl)
  .constant('cql', window.cql)
  .constant('vlSchema', window.vlSchema)
  .constant('vg', window.vg)
  .constant('util', window.vg.util)
  // other libraries
  .constant('jQuery', window.$)
  .constant('Papa', window.Papa)
  .constant('Blob', window.Blob)
  .constant('URL', window.URL)
  .constant('Drop', window.Drop)
  .constant('Heap', window.Heap)
  // Use the customized vendor/json3-compactstringify
  .constant('JSON3', window.JSON3.noConflict())
  .constant('ANY', '__ANY__')
  // constants
  .constant('consts', {
    addCount: true, // add count field to Dataset.dataschema
    debug: true,
    useUrl: true,
    logging: true,
    logLevel: 'INFO',
    logPrintLevel: 'INFO',
    logToWebSql: false, // in user studies, set this to true
    defaultConfigSet: 'large',
    appId: 'vlui',
    // embedded polestar and voyager with known data
    embeddedData: window.vguiData || undefined,
    priority: {
      bookmark: 0,
      popup: 0,
      vislist: 1000
    },
    myriaRest: 'http://ec2-52-1-38-182.compute-1.amazonaws.com:8753',
    defaultTimeFn: 'year'
  });
}());

;(function() {
angular.module("vlui").run(["$templateCache", function($templateCache) {$templateCache.put("dataset/addmyriadataset.html","<div class=\"add-myria-dataset\"><p>Select a dataset from the Myria instance at <input ng-model=\"myriaRestUrl\"><button ng-click=\"loadDatasets(\'\')\">update</button>.</p><form ng-submit=\"addDataset(myriaDataset)\"><div><select name=\"myria-dataset\" id=\"select-myria-dataset\" ng-disabled=\"disabled\" ng-model=\"myriaDataset\" ng-options=\"optionName(dataset) for dataset in myriaDatasets track by dataset.relationName\"><option value=\"\">Select Dataset...</option></select></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/addurldataset.html","<div class=\"add-url-dataset\"><p>Add the name of the dataset and the URL to a <b>JSON</b> or <b>CSV</b> (with header) file. Make sure that the formatting is correct and clean the data before adding it. The added dataset is only visible to you.</p><form ng-submit=\"addFromUrl(addedDataset)\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input ng-model=\"addedDataset.name\" id=\"dataset-name\" type=\"text\"></div><div class=\"form-group\"><label for=\"dataset-url\">URL</label> <input ng-model=\"addedDataset.url\" id=\"dataset-url\" type=\"url\"><p>Make sure that you host the file on a server that has <code>Access-Control-Allow-Origin: *</code> set.</p></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/changeloadeddataset.html","<div class=\"change-loaded-dataset\"><div ng-if=\"userData.length\"><h3>Uploaded Datasets</h3><ul><li ng-repeat=\"dataset in userData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <span ng-if=\"dataset.description\">{{dataset.description}}</span> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong></li></ul></div><h3>Explore a Sample Dataset</h3><ul class=\"loaded-dataset-list\"><li ng-repeat=\"dataset in sampleData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong> <em ng-if=\"dataset.description\">{{dataset.description}}</em></li></ul></div>");
$templateCache.put("dataset/datasetmodal.html","<modal id=\"dataset-modal\" max-width=\"800px\"><div class=\"modal-header\"><modal-close-button></modal-close-button><h2>Add Dataset</h2></div><div class=\"modal-main\"><tabset><tab heading=\"Change Dataset\"><change-loaded-dataset></change-loaded-dataset></tab><tab heading=\"Paste or Upload Data\"><paste-dataset></paste-dataset></tab><tab heading=\"From URL\"><add-url-dataset></add-url-dataset></tab><tab heading=\"From Myria\"><add-myria-dataset></add-myria-dataset></tab></tabset></div></modal>");
$templateCache.put("dataset/datasetselector.html","<button id=\"select-data\" class=\"small-button select-data\" ng-click=\"loadDataset();\">Change</button>");
$templateCache.put("dataset/filedropzone.html","<div class=\"dropzone\" ng-transclude=\"\"></div>");
$templateCache.put("dataset/pastedataset.html","<div class=\"paste-data\"><file-dropzone dataset=\"dataset\" max-file-size=\"10\" valid-mime-types=\"[text/csv, text/json, text/tsv]\"><div class=\"upload-data\"><div class=\"form-group\"><label for=\"dataset-file\">File</label> <input type=\"file\" id=\"dataset-file\" accept=\"text/csv,text/tsv\"></div><p>Upload a CSV, or paste data in <a href=\"https://en.wikipedia.org/wiki/Comma-separated_values\">CSV</a> format into the fields.</p><div class=\"dropzone-target\"><p>Drop CSV file here</p></div></div><form ng-submit=\"addDataset()\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input type=\"name\" ng-model=\"dataset.name\" id=\"dataset-name\" required=\"\"></div><div class=\"form-group\"><textarea ng-model=\"dataset.data\" ng-model-options=\"{ updateOn: \'default blur\', debounce: { \'default\': 17, \'blur\': 0 }}\" required=\"\">\n      </textarea></div><button type=\"submit\">Add data</button></form></file-dropzone></div>");
$templateCache.put("components/alertmessages/alertmessages.html","<div class=\"alert-box\" ng-show=\"Alerts.alerts.length > 0\"><div class=\"alert-item\" ng-repeat=\"alert in Alerts.alerts\">{{ alert.msg }} <a class=\"close\" ng-click=\"Alerts.closeAlert($index)\">&times;</a></div></div>");
$templateCache.put("components/bookmarklist/bookmarklist.html","<modal id=\"bookmark-list\" ng-if=\"Bookmarks.isSupported\"><div class=\"modal-header card no-top-margin no-right-margin\"><modal-close-button close-action=\"Bookmarks.logBookmarksClosed()\"></modal-close-button><h2 class=\"no-bottom-margin\">Bookmarks ({{ Bookmarks.list.length }})</h2><a class=\"bookmark-list-util\" ng-click=\"Bookmarks.clear()\"><i class=\"fa fa-trash-o\"></i> Clear all</a> <a class=\"bookmark-list-util\" ng-click=\"Bookmarks.export()\"><i class=\"fa fa-clipboard\"></i> Export</a></div><div class=\"flex-grow-1 scroll-y\"><div ng-if=\"Bookmarks.list.length > 0\" class=\"hflex flex-wrap\" sv-root=\"\" sv-part=\"Bookmarks.list\" sv-on-sort=\"Bookmarks.reorder()\"><vl-plot-group ng-repeat=\"bookmark in Bookmarks.list | orderObjectBy : \'timeAdded\' : false\" class=\"wrapped-vl-plot-group card\" list-title=\"Bookmark\" chart=\"bookmark.chart\" field-set=\"bookmark.chart.fieldSet\" show-bookmark=\"true\" show-debug=\"consts.debug\" show-expand=\"false\" always-selected=\"true\" highlighted=\"highlighted\" overflow=\"true\" tooltip=\"true\" priority=\"consts.priority.bookmark\" sv-element=\"\"></vl-plot-group><div sv-placeholder=\"\"></div></div><div class=\"vis-list-empty\" ng-if=\"Bookmarks.list.length === 0\">You have no bookmarks</div></div></modal>");
$templateCache.put("components/channelshelf/channelshelf.html","<div class=\"shelf-group\"><div class=\"shelf\" ng-class=\"{disabled: disabled || !supportMark(channelId, mark), \'any\': isAnyChannel}\"><div class=\"shelf-label\" ng-class=\"{expanded: propsExpanded}\">{{ isAnyChannel ? \'any\' : channelId }}</div><div class=\"field-drop\" ng-model=\"pills[channelId]\" data-drop=\"!disabled && supportMark(channelId, mark)\" jqyoui-droppable=\"{onDrop:\'fieldDropped\'}\" data-jqyoui-options=\"{activeClass: \'drop-active\'}\"><field-info ng-show=\"encoding[channelId].field\" ng-class=\"{ expanded: funcsExpanded, any: isAnyField, \'enumerated-field\': isEnumeratedField, \'enumerated-channel\': isEnumeratedChannel, highlighted: isHighlighted(channelId) }\" field-def=\"encoding[channelId]\" show-type=\"true\" show-caret=\"true\" disable-count-caret=\"true\" popup-content=\"fieldInfoPopupContent\" show-remove=\"true\" remove-action=\"removeField()\" class=\"selected draggable full-width\" data-drag=\"true\" ng-model=\"pills[channelId]\" jqyoui-draggable=\"{onStart: \'fieldDragStart\', onStop:\'fieldDragStop\'}\" data-jqyoui-options=\"{revert: \'invalid\', helper: \'clone\'}\"></field-info><span class=\"placeholder\" ng-if=\"!encoding[channelId].field\">drop a field here</span></div></div><div class=\"drop-container\"><div class=\"popup-menu shelf-properties shelf-properties-{{channelId}}\"></div><div class=\"popup-menu shelf-functions shelf-functions-{{channelId}}\"><function-select ng-if=\"!preview\" field-def=\"encoding[channelId]\" channel-id=\"channelId\"></function-select><div class=\"mb5\" ng-if=\"allowedTypes.length>1\"><h4>Type</h4><label class=\"type-label\" ng-repeat=\"type in allowedTypes\"><input type=\"radio\" ng-value=\"type\" ng-model=\"encoding[channelId].type\"> {{type}}</label></div></div></div></div>");
$templateCache.put("components/fieldinfo/fieldinfo.html","<span class=\"field-info\"><span class=\"hflex full-width\" ng-click=\"clicked($event)\"><span class=\"type-caret\" ng-class=\"{active: !disableCountCaret || fieldDef.aggregate!==\'count\'}\"><i class=\"fa fa-caret-down\" ng-show=\"showCaret\"></i> <span class=\"type fa {{icon}}\" ng-show=\"showType\" title=\"{{typeName}}\"></span></span> <span ng-if=\"fieldDef.aggregate!==\'count\'\" class=\"field-info-text\"><span ng-if=\"func(fieldDef)\" class=\"field-func\" title=\"{{ func(fieldDef) }}\" ng-class=\"{any: fieldDef._any}\">{{ func(fieldDef) }}</span><span class=\"field-name\" ng-class=\"{hasfunc: func(fieldDef), any: fieldDef._any}\">{{ (fieldDef.title || fieldDef.field) | underscore2space }}</span></span> <span ng-if=\"fieldDef.aggregate===\'count\' || fieldDef.autoCount\" class=\"field-count field-info-text\"><span class=\"field-name\">COUNT</span></span> <span class=\"no-shrink remove\" ng-show=\"showRemove\"><a class=\"remove-field\" ng-click=\"removeAction()\"><i class=\"fa fa-times\"></i></a></span> <span class=\"no-shrink add\" ng-show=\"showAdd\"><a class=\"add-field\" ng-click=\"addAction()\"><i class=\"fa fa-plus\"></i></a></span></span></span>");
$templateCache.put("components/functionselect/functionselect.html","<div class=\"mb5\" ng-if=\"func.list.aboveFold.length > 1 || func.list.aboveFold[0] !== undefined\"><h4>Function</h4><div><label class=\"func-label field-func\" ng-repeat=\"f in func.list.aboveFold\" ng-class=\"{none: !f}\"><input type=\"radio\" ng-value=\"f\" ng-model=\"func.selected\" ng-change=\"selectChanged()\"> {{f || \'NONE\'}}</label></div><div ng-show=\"showAllFunctions\"><label class=\"func-label field-func\" ng-class=\"{\'single-column\': func.isTemporal}\" ng-repeat=\"f in func.list.belowFold\"><input type=\"radio\" ng-value=\"f\" ng-model=\"func.selected\" ng-change=\"selectChanged()\"> {{f}}</label></div><div ng-hide=\"func.isCount || func.list.belowFold.length == 0\" class=\"expand-collapse\"><a ng-click=\"showAllFunctions=!showAllFunctions\"><span ng-show=\"!showAllFunctions\">more <i class=\"fa fa-angle-down\" aria-hidden=\"true\"></i></span> <span ng-show=\"showAllFunctions\">less <i class=\"fa fa-angle-up\" aria-hidden=\"true\"></i></span></a></div></div>");
$templateCache.put("components/modal/modal.html","<div class=\"modal\" ng-if=\"isOpen\"><div class=\"modal-wrapper\" style=\"{{wrapperStyle}}\" ng-transclude=\"\"></div></div>");
$templateCache.put("components/modal/modalclosebutton.html","<div class=\"right\"><a ng-click=\"closeModal()\" class=\"right\">Close</a></div>");
$templateCache.put("components/propertyeditor/propertyeditor.html","<div><label class=\"prop-label\" for=\"{{ id }}\"><span class=\"name\" title=\"{{ propName }}\">{{ propName }}</span> <span ng-if=\"description\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<strong>{{ propName }}</strong><div class=\'tooltip-content\'>{{ description }}</div>\" tooltip-side=\"right\"></span></label><form class=\"inline-block\" ng-switch=\"type + (enum !== undefined ? \'list\' : \'\')\"><input id=\"{{ id }}\" ng-switch-when=\"boolean\" type=\"checkbox\" ng-model=\"group[propName]\" ng-hide=\"automodel.value\"><select id=\"{{ id }}\" ng-switch-when=\"stringlist\" ng-model=\"group[propName]\" ng-options=\"choice for choice in enum track by choice\" ng-hide=\"automodel.value\"></select><input id=\"{{ id }}\" ng-switch-when=\"integer\" ng-attr-type=\"{{ isRange ? \'range\' : \'number\'}}\" ng-model=\"group[propName]\" ng-model-options=\"{debounce: 200}\" ng-attr-min=\"{{min}}\" ng-attr-max=\"{{max}}\" ng-hide=\"automodel.value\" ng-attr-title=\"{{ isRange ? group[propName] : undefined }}\"> <input id=\"{{ id }}\" ng-attr-type=\"{{ role === \'color\' ? \'color\' : \'string\' }}\" ng-switch-when=\"string\" ng-model=\"group[propName]\" ng-model-options=\"{debounce: 500}\" ng-hide=\"automodel.value\"> <small ng-if=\"hasAuto\"><label>Auto <input ng-model=\"automodel.value\" type=\"checkbox\"></label></small></form></div>");
$templateCache.put("components/schemalist/schemalist.html","<div class=\"schema no-top-margin full-width\"><schema-list-item ng-repeat=\"fieldDef in fieldDefs | orderBy : orderBy\" field-def=\"fieldDef\" show-add=\"showAdd\"></schema-list-item></div>");
$templateCache.put("components/schemalist/schemalistitem.html","<field-info field-def=\"fieldDef\" show-type=\"true\" show-add=\"showAdd\" class=\"pill list-item draggable full-width no-right-margin\" ng-class=\"{any: isEnumSpec(fieldDef.field)}\" ng-model=\"pill\" ng-dblclick=\"fieldAdd(fieldDef)\" add-action=\"fieldAdd(fieldDef)\" data-drag=\"true\" jqyoui-draggable=\"{placeholder: \'keep\', deepCopy: true, onStart: \'fieldDragStart\', onStop:\'fieldDragStop\'}\" data-jqyoui-options=\"{revert: \'invalid\', helper: \'clone\'}\"></field-info>");
$templateCache.put("components/shelves/shelves.html","<div class=\"card shelves no-top-margin no-right-margin abs-100\"><a class=\"right\" ng-click=\"clear()\"><i class=\"fa fa-eraser\"></i> Clear</a><h2>Encoding</h2><div class=\"shelf-pane shelf-encoding-pane full-width\"><h3>Positional</h3><channel-shelf channel-id=\"\'x\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'y\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'column\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\" disabled=\"!spec.encoding.x.field\">></channel-shelf><channel-shelf channel-id=\"\'row\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\" disabled=\"!spec.encoding.y.field\"></channel-shelf></div><div class=\"shelf-pane shelf-marks-pane full-width\"><div class=\"right\"><select class=\"markselect\" ng-model=\"spec.mark\" ng-class=\"{auto: spec.mark === ANY}\" ng-options=\"(type === ANY ? \'auto\' : type) for type in (supportAny ? marksWithAny : marks)\" ng-change=\"markChange()\"></select></div><h3>Marks</h3><channel-shelf channel-id=\"\'size\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'color\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'shape\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'detail\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'text\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf></div><div class=\"shelf-pane shelf-any-pane full-width\" ng-if=\"supportAny && !preview\"><h3>Automatic</h3><channel-shelf ng-repeat=\"channelId in anyChannelIds\" preview=\"preview\" channel-id=\"channelId\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf></div></div>");
$templateCache.put("components/tabs/tab.html","<div ng-if=\"active\" ng-transclude=\"\"></div>");
$templateCache.put("components/tabs/tabset.html","<div class=\"tab-container\"><div><a class=\"tab\" ng-repeat=\"tab in tabset.tabs\" ng-class=\"{\'active\': tab.active}\" ng-click=\"tabset.showTab(tab)\">{{tab.heading}}</a></div><div class=\"tab-contents\" ng-transclude=\"\"></div></div>");
$templateCache.put("components/vlplot/vlplot.html","<div class=\"vl-plot\" id=\"vis-{{visId}}\" ng-class=\"{ fit: !alwaysScrollable && !overflow && (maxHeight && (!height || height <= maxHeight)) && (maxWidth && (!width || width <= maxWidth)), overflow: alwaysScrollable || overflow || (maxHeight && height && height > maxHeight) || (maxWidth && width && width > maxWidth), scroll: alwaysScrollable || unlocked || hoverFocus }\" ng-mousedown=\"unlocked=!thumbnail\" ng-mouseup=\"unlocked=false\" ng-mouseover=\"mouseover()\" ng-mouseout=\"mouseout()\"><div class=\"vis-tooltip\" ng-show=\"tooltipActive\"><table><tr ng-repeat=\"p in data\"><td class=\"key\">{{p[0]}}</td><td class=\"value\"><b>{{p[1]}}</b></td></tr></table></div></div>");
$templateCache.put("components/vlplotgroup/vlplotgroup.html","<div class=\"vl-plot-group vflex\"><div ng-show=\"showExpand || fieldSet || showTranspose || showBookmark && Bookmarks.isSupported || showToggle\" class=\"vl-plot-group-header no-shrink\"><div class=\"field-set-info\"><field-info ng-repeat=\"fieldDef in fieldSet\" ng-if=\"fieldSet && (fieldDef.field || fieldDef.autoCount)\" field-def=\"fieldDef\" enum-spec-index=\"chart.enumSpecIndex\" show-type=\"true\" ng-class=\"{ selected: alwaysSelected || (isSelected && isSelected(fieldDef.field)), unselected: isSelected && !isSelected(fieldDef.field), highlighted: (highlighted||{})[fieldDef.field], \'enumerated-field\': isEnumeratedField(chart, $index), \'enumerated-channel\': isEnumeratedChannel(chart, $index) }\" ng-mouseover=\"fieldInfoMouseover(fieldDef, $index)\" ng-mouseout=\"fieldInfoMouseout(fieldDef, $index)\"></field-info></div><div class=\"toolbox\"><a ng-if=\"consts.debug && showDebug\" class=\"command debug\"><i class=\"fa fa-wrench\" ng-click=\"shCopied=\'\'; vlCopied=\'\'; vgCopied=\'\';\" ng-mouseover=\"initializePopup();\"></i></a><vl-plot-group-popup ng-if=\"consts.debug && showDebug && renderPopup\"></vl-plot-group-popup><a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'x\')\" class=\"command\" title=\"Toggle X-Scale\" ng-click=\"log.toggle(chart.vlSpec, \'x\')\" ng-class=\"{active: log.active(chart.vlSpec, \'x\')}\"><i class=\"fa fa-long-arrow-right\"></i> <small>Log X</small></a> <a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'y\')\" class=\"command\" title=\"Toggle Y-Scale\" ng-click=\"log.toggle(chart.vlSpec, \'y\')\" ng-class=\"{active: log.active(chart.vlSpec, \'y\')}\"><i class=\"fa fa-long-arrow-up\"></i> <small>Log Y</small></a> <a ng-if=\"showSort && chart.vlSpec && toggleSort.support(chart.vlSpec)\" class=\"command\" ng-click=\"toggleSort.toggle(chart.vlSpec)\" title=\"Sort\"><i class=\"fa sort\" ng-class=\"toggleSortClass(chart.vlSpec)\"></i> <small ng-if=\"showLabel\">Sort</small></a> <a ng-if=\"showFilterNull && chart.vlSpec && toggleFilterNull.support(chart.vlSpec)\" class=\"command\" ng-click=\"toggleFilterNull(chart.vlSpec)\" title=\"Filter Null\" ng-class=\"{active: chart.vlSpec && (chart.vlSpec.transform||{}).filterInvalid}\"><i class=\"fa fa-filter\"></i> <small ng-if=\"showLabel\">Filter</small> <small>NULL</small></a> <a ng-if=\"showTranspose\" title=\"Swap X/Y\" class=\"command\" ng-click=\"transpose()\"><i class=\"fa fa-refresh transpose\"></i> <small ng-if=\"showLabel\">Swap X/Y</small></a> <a ng-if=\"showBookmark && Bookmarks.isSupported\" class=\"command\" title=\"Bookmark\" ng-click=\"toggleBookmark(chart)\" ng-class=\"{disabled: !chart.vlSpec.encoding, active: Bookmarks.isBookmarked(chart.shorthand)}\"><i class=\"fa fa-bookmark\"></i> <small ng-if=\"showLabel\">Bookmark</small></a> <a ng-if=\"showExpand\" ng-click=\"expandAction()\" class=\"command\"><i class=\"fa fa-expand\"></i></a> <a ng-if=\"showSelect\" title=\"Set encoding to this chart\" ng-click=\"selectAction()\" class=\"command select\"><i class=\"fa fa-server\"></i></a><div ng-if=\"showBookmarkAlert\" class=\"bookmark-alert\"><div>Remove bookmark?</div><small>Your notes will be lost.</small><div><a ng-click=\"removeBookmark(chart)\"><i class=\"fa fa-trash-o\"></i> remove it</a> <a ng-click=\"keepBookmark()\"><i class=\"fa fa-bookmark\"></i> keep it</a></div></div></div></div><vl-plot class=\"flex-grow-1\" chart=\"chart\" disabled=\"disabled\" is-in-list=\"isInList\" list-title=\"listTitle\" always-scrollable=\"alwaysScrollable\" config-set=\"{{configSet||\'small\'}}\" max-height=\"maxHeight\" max-width=\"maxWidth\" overflow=\"overflow\" priority=\"priority\" rescale=\"rescale\" thumbnail=\"thumbnail\" tooltip=\"tooltip\"></vl-plot><textarea class=\"annotation\" ng-if=\"Bookmarks.isBookmarked(chart.shorthand)\" ng-model=\"Bookmarks.dict[chart.shorthand].annotation\" ng-change=\"Bookmarks.saveAnnotations(chart.shorthand)\" placeholder=\"notes\"></textarea></div>");
$templateCache.put("components/vlplotgroup/vlplotgrouppopup.html","<div class=\"drop-container\"><div class=\"popup-menu popup-command no-shrink dev-tool\"><div class=\"command debug\"><span class=\"debug\">Vl</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vlCopied=\'(Copied)\'\" zeroclip-model=\"chart.cleanSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega-Lite\', chart.cleanSpec); vlCopied=\'(Logged)\';\">Log</a> <span>{{vlCopied}}</span></div><div class=\"command debug\"><span class=\"debug\">Vg</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vgCopied=\'(Copied)\'\" zeroclip-model=\"chart.vgSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega\', chart.vgSpec); vgCopied=\'(Logged)\';\">Log</a> <span>{{vgCopied}}</span></div><a class=\"command debug\" ng-href=\"{{ {type:\'vl\', spec: chart.cleanSpec} | reportUrl }}\" target=\"_blank\">Report Bad Render</a> <a ng-click=\"showFeature=!showFeature\" class=\"command debug\">{{chart.score}}</a><div ng-repeat=\"f in chart.scoreFeatures track by f.reason\">[{{f.score}}] {{f.reason}}</div></div></div>");
$templateCache.put("components/vlplotgrouplist/vlplotgrouplist.html","<div class=\"vl-plot-group-list-container\"><div class=\"vis-list-header\" ng-show=\"listTitle && !hideListTitle\"><h3>{{listTitle}}</h3><span class=\"description\"></span></div><div class=\"vis-list hflex flex-wrap\"><vl-plot-group ng-repeat=\"chart in charts | limitTo: limit\" class=\"wrapped-vl-plot-group card\" chart=\"chart\" is-in-list=\"isInList\" list-title=\"listTitle\" enable-pills-preview=\"enablePillsPreview\" field-set=\"chart.fieldSet\" show-bookmark=\"true\" show-debug=\"consts.debug && consts.debugInList\" show-select=\"true\" show-filter-null=\"true\" show-log=\"true\" show-sort=\"true\" overflow=\"true\" tooltip=\"true\" highlighted=\"Pills.highlighted\" select-action=\"select(chart)\" priority=\"priority + $index\"></vl-plot-group></div><a ng-click=\"increaseLimit()\"><div class=\"vis-list-more\" ng-show=\"limit < charts.length\">Load more...</div></a></div>");}]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addMyriaDataset
 * @description
 * # addMyriaDataset
 */
angular.module('vlui')
  .directive('addMyriaDataset', ['$http', 'Dataset', 'consts', function ($http, Dataset, consts) {
    return {
      templateUrl: 'dataset/addmyriadataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.myriaRestUrl = consts.myriaRest;
        scope.myriaDatasets = [];
        scope.myriaDataset = null;

        scope.loadDatasets = function(query) {
          return $http.get(scope.myriaRestUrl + '/dataset/search/?q=' + query)
            .then(function(response) {
              scope.myriaDatasets = response.data;
            });
        };

        // Load the available datasets from Myria
        scope.loadDatasets('');

        scope.optionName = function(dataset) {
          return dataset.userName + ':' + dataset.programName + ':' + dataset.relationName;
        };

        scope.addDataset = function(myriaDataset) {
          var dataset = {
            group: 'myria',
            name: myriaDataset.relationName,
            url: scope.myriaRestUrl + '/dataset/user-' + myriaDataset.userName +
              '/program-' + myriaDataset.programName +
              '/relation-' + myriaDataset.relationName + '/data?format=json'
          };

          Dataset.type = 'json';
          Dataset.dataset = Dataset.add(dataset);
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addUrlDataset
 * @description
 * # addUrlDataset
 */
angular.module('vlui')
  .directive('addUrlDataset', ['Dataset', 'Logger', function (Dataset, Logger) {
    return {
      templateUrl: 'dataset/addurldataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // the dataset to add
        scope.addedDataset = {
          group: 'user'
        };

        scope.addFromUrl = function(dataset) {
          Logger.logInteraction(Logger.actions.DATASET_NEW_URL, dataset.url);

          // Register the new dataset
          Dataset.dataset = Dataset.add(dataset);

          // Fetch & activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:inGroup
 * @function
 * @description
 * # inGroup
 * Get datasets in a particular group
 * @param  {String} datasetGroup One of "sample," "user", or "myria"
 * @return {Array} An array of datasets in the specified group
 */
angular.module('vlui')
  .filter('inGroup', ['_', function(_) {
    return function(arr, datasetGroup) {
      return _.filter(arr, {
        group: datasetGroup
      });
    };
  }]);

/**
 * @ngdoc directive
 * @name vlui.directive:changeLoadedDataset
 * @description
 * # changeLoadedDataset
 */
angular.module('vlui')
  .directive('changeLoadedDataset', ['Dataset', '_', function (Dataset, _) {
    return {
      templateUrl: 'dataset/changeloadeddataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Expose dataset object itself so current dataset can be marked
        scope.Dataset = Dataset;

        scope.userData = _.filter(Dataset.datasets, function(dataset) {
          return dataset.group !== 'sample';
        });

        scope.sampleData = _.filter(Dataset.datasets, {
          group: 'sample'
        });

        var datasetWatcher = scope.$watch(function() {
          return Dataset.datasets.length;
        }, function() {
          scope.userData = _.filter(Dataset.datasets, function(dataset) {
            return dataset.group !== 'sample';
          });
        });

        scope.selectDataset = function(dataset) {
          // Activate the selected dataset
          Dataset.update(dataset);
          closeModal();
        };

        scope.$on('$destroy', function() {
          // Clean up watchers
          datasetWatcher();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .factory('Dataset', ['$http', '$q', 'Alerts', '_', 'util', 'vl', 'cql', 'SampleData', 'Config', 'Logger', function($http, $q, Alerts, _, util, vl, cql, SampleData, Config, Logger) {
    var Dataset = {};

    // Start with the list of sample datasets
    var datasets = SampleData;

    Dataset.datasets = datasets;
    Dataset.dataset = datasets[1];
    Dataset.currentDataset = undefined;  // dataset before update
    Dataset.dataschema = [];
    Dataset.stats = {};
    Dataset.type = undefined;

    var typeOrder = {
      nominal: 0,
      ordinal: 0,
      geographic: 2,
      temporal: 3,
      quantitative: 4
    };

    Dataset.fieldOrderBy = {};

    Dataset.fieldOrderBy.type = function(fieldDef) {
      if (fieldDef.aggregate==='count') return 4;
      return typeOrder[fieldDef.type];
    };

    Dataset.fieldOrderBy.typeThenName = function(fieldDef) {
      return Dataset.fieldOrderBy.type(fieldDef) + '_' +
        (fieldDef.aggregate === 'count' ? '~' : fieldDef.field.toLowerCase());
        // ~ is the last character in ASCII
    };

    Dataset.fieldOrderBy.original = function() {
      return 0; // no swap will occur
    };

    Dataset.fieldOrderBy.field = function(fieldDef) {
      return fieldDef.field;
    };

    Dataset.fieldOrder = Dataset.fieldOrderBy.typeThenName;

    // update the schema and stats
    Dataset.onUpdate = [];

    Dataset.update = function(dataset) {
      var updatePromise;

      Logger.logInteraction(Logger.actions.DATASET_CHANGE, dataset.name);

      if (dataset.values) {
        updatePromise = $q(function(resolve, reject) {
          // jshint unused:false
          Dataset.type = undefined;
          updateFromData(dataset, dataset.values);
          resolve();
        });
      } else {
        updatePromise = $http.get(dataset.url, {cache: true}).then(function(response) {
          var data;

          // first see whether the data is JSON, otherwise try to parse CSV
          if (_.isObject(response.data)) {
             data = response.data;
             Dataset.type = 'json';
          } else {
            data = util.read(response.data, {type: 'csv'});
            Dataset.type = 'csv';
          }

          updateFromData(dataset, data);
        });
      }

      Dataset.onUpdate.forEach(function(listener) {
        updatePromise = updatePromise.then(listener);
      });

      // Copy the dataset into the config service once it is ready
      updatePromise.then(function() {
        Config.updateDataset(dataset, Dataset.type);
      });

      return updatePromise;
    };

    function getFieldDefs(schema, order) {
      var fieldDefs = schema.fields().map(function(field) {
        return {
          field: field,
          type: schema.type(field),
          primitiveType: schema.primitiveType(field)
        };
      });

      fieldDefs = util.stablesort(fieldDefs, order || Dataset.fieldOrderBy.typeThenName, Dataset.fieldOrderBy.field);

      fieldDefs.push({ field: '*', aggregate: vl.aggregate.AggregateOp.COUNT, type: vl.type.QUANTITATIVE});
      return fieldDefs;
    }


    function updateFromData(dataset, data) {
      Dataset.data = data;
      Dataset.currentDataset = dataset;

      Dataset.schema = cql.schema.Schema.build(data);
      // TODO: find all reference of Dataset.stats.sample and replace

      // TODO: find all reference of Dataset.dataschema and replace
      Dataset.dataschema = getFieldDefs(Dataset.schema);
    }

    Dataset.add = function(dataset) {
      if (!dataset.id) {
        dataset.id = dataset.url;
      }
      datasets.push(dataset);

      return dataset;
    };

    return Dataset;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:datasetModal
 * @description
 * # datasetModal
 */
angular.module('vlui')
  .directive('datasetModal', function () {
    return {
      templateUrl: 'dataset/datasetmodal.html',
      restrict: 'E',
      scope: false
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('datasetSelector', ['Modals', 'Logger', function(Modals, Logger) {
    return {
      templateUrl: 'dataset/datasetselector.html',
      restrict: 'E',
      replace: true,
      scope: {},
      link: function postLink(scope/*, element, attrs*/) {
        scope.loadDataset = function() {
          Logger.logInteraction(Logger.actions.DATASET_OPEN);
          Modals.open('dataset-modal');
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fileDropzone
 * @description
 * # fileDropzone
 */
angular.module('vlui')
  // Add the file reader as a named dependency
  .constant('FileReader', window.FileReader)
  .directive('fileDropzone', ['Modals', 'Alerts', 'FileReader', function (Modals, Alerts, FileReader) {

    // Helper methods

    function isSizeValid(size, maxSize) {
      // Size is provided in bytes; maxSize is provided in megabytes
      // Coerce maxSize to a number in case it comes in as a string,
      // & return true when max file size was not specified, is empty,
      // or is sufficiently large
      return !maxSize || ( size / 1024 / 1024 < +maxSize );
    }

    function isTypeValid(type, validMimeTypes) {
        // If no mime type restrictions were provided, or the provided file's
        // type is whitelisted, type is valid
      return !validMimeTypes || ( validMimeTypes.indexOf(type) > -1 );
    }

    return {
      templateUrl: 'dataset/filedropzone.html',
      replace: true,
      restrict: 'E',
      // Permit arbitrary child content
      transclude: true,
      scope: {
        maxFileSize: '@',
        validMimeTypes: '@',
        // Expose this directive's dataset property to parent scopes through
        // two-way databinding
        dataset: '='
      },
      link: function (scope, element/*, attrs*/) {
        scope.dataset = scope.dataset || {};

        element.on('dragover dragenter', function onDragEnter(event) {
          if (event) {
            event.preventDefault();
          }
          event.originalEvent.dataTransfer.effectAllowed = 'copy';
        });

        function readFile(file) {
          if (!isTypeValid(file.type, scope.validMimeTypes)) {
            scope.$apply(function() {
              Alerts.add('Invalid file type. File must be one of following types: ' + scope.validMimeTypes);
            });
            return;
          }
          if (!isSizeValid(file.size, scope.maxFileSize)) {
            scope.$apply(function() {
              Alerts.add('File must be smaller than ' + scope.maxFileSize + ' MB');
            });
            return;
          }
          var reader = new FileReader();

          reader.onload = function(evt) {
            return scope.$apply(function(scope) {
              scope.dataset.data = evt.target.result;
              // Strip file name extensions from the uploaded data
              scope.dataset.name = file.name.replace(/\.\w+$/, '');
            });
          };

          reader.onerror = function() {
            Alerts.add('Error reading file');
          };

          reader.readAsText(file);
        }

        element.on('drop', function onDrop(event) {
          if (event) {
            event.preventDefault();
          }

          readFile(event.originalEvent.dataTransfer.files[0]);
        });

        element.find('input[type="file"]').on('change', function onUpload(/*event*/) {
          // "this" is the input element
          readFile(this.files[0]);
        });
      }

    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:pasteDataset
 * @description
 * # pasteDataset
 */
angular.module('vlui')
  .directive('pasteDataset', ['Dataset', 'Logger', 'Config', '_', 'vg', function (Dataset, Logger, Config, _, vg) {
    return {
      templateUrl: 'dataset/pastedataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.dataset = {
          name: '',
          data: ''
        };

        scope.addDataset = function() {
          var data = vg.util.read(scope.dataset.data, {
            type: 'csv'
          });

          var pastedDataset = {
            id: Date.now(),  // time as id
            name: scope.dataset.name,
            values: data,
            group: 'pasted'
          };

          // Log that we have pasted data
          Logger.logInteraction(Logger.actions.DATASET_NEW_PASTE, pastedDataset.name);

          // Register the pasted data as a new dataset
          Dataset.dataset = Dataset.add(pastedDataset);

          // Activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          // Close this directive's containing modal
          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui').constant('SampleData', [{
  name: 'Barley',
  description: 'Barley yield by variety across the upper midwest in 1931 and 1932',
  url: 'data/barley.json',
  id: 'barley',
  group: 'sample'
},{
  name: 'Cars',
  description: 'Automotive statistics for a variety of car models between 1970 & 1982',
  url: 'data/cars.json',
  id: 'cars',
  group: 'sample'
},{
  name: 'Crimea',
  url: 'data/crimea.json',
  id: 'crimea',
  group: 'sample'
},{
  name: 'Driving',
  url: 'data/driving.json',
  id: 'driving',
  group: 'sample'
},{
  name: 'Iris',
  url: 'data/iris.json',
  id: 'iris',
  group: 'sample'
},{
  name: 'Jobs',
  url: 'data/jobs.json',
  id: 'jobs',
  group: 'sample'
},{
  name: 'Population',
  url: 'data/population.json',
  id: 'population',
  group: 'sample'
},{
  name: 'Movies',
  url: 'data/movies.json',
  id: 'movies',
  group: 'sample'
},{
  name: 'Birdstrikes',
  url: 'data/birdstrikes.json',
  id: 'birdstrikes',
  group: 'sample'
},{
  name: 'Burtin',
  url: 'data/burtin.json',
  id: 'burtin',
  group: 'sample'
},{
  name: 'Campaigns',
  url: 'data/weball26.json',
  id: 'weball26',
  group: 'sample'
}]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('alertMessages', ['Alerts', function(Alerts) {
    return {
      templateUrl: 'components/alertmessages/alertmessages.html',
      restrict: 'E',
      scope: {},
      link: function(scope /*, element, attrs*/) {
        scope.Alerts = Alerts;
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:bookmarkList
 * @description
 * # bookmarkList
 */
angular.module('vlui')
  .directive('bookmarkList', ['Bookmarks', 'consts', function (Bookmarks, consts) {
    return {
      templateUrl: 'components/bookmarklist/bookmarklist.html',
      restrict: 'E',
      replace: true,
      scope: {
        highlighted: '=' // This one is really two-way binding.
      },
      link: function postLink(scope /*, element, attrs*/) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('channelShelf', ['ANY', 'Dataset', 'Pills', '_', 'Drop', 'Logger', 'vl', 'cql', 'Schema', function(ANY, Dataset, Pills, _, Drop, Logger, vl, cql, Schema) {
    return {
      templateUrl: 'components/channelshelf/channelshelf.html',
      restrict: 'E',
      replace: true,
      scope: {
        channelId: '<',
        encoding: '=',
        mark: '<',
        preview: '<',
        disabled: '<'
      },
      link: function(scope, element /*, attrs*/) {
        var propsPopup;

        // TODO(https://github.com/vega/vega-lite-ui/issues/187):
        // consider if we can use validator / cql instead
        scope.allowedCasting = {
          quantitative: [vl.type.QUANTITATIVE, vl.type.ORDINAL, vl.type.NOMINAL],
          ordinal: [vl.type.ORDINAL, vl.type.NOMINAL],
          nominal: [vl.type.NOMINAL, vl.type.ORDINAL],
          temporal: [vl.type.TEMPORAL, vl.type.ORDINAL, vl.type.NOMINAL]
        };

        scope.Dataset = Dataset;
        scope.schema = Schema.getChannelSchema(scope.channelId);
        scope.pills = Pills.pills;

        scope.isHighlighted = function (channelId) {
          var highlighted = Pills.highlighted || {};
          return highlighted[scope.encoding[channelId].field] ||
            highlighted['f' + channelId];
        };

        // These will get updated in the watcher
        scope.isAnyChannel = false;
        scope.isAnyField = false;

        scope.supportMark = function(channelId, mark) {
          if (Pills.isAnyChannel(channelId)) {
            return true;
          }
          if (mark === ANY) { // TODO: support {enum: [...]}
            return true;
          }
          return vl.channel.supportMark(channelId, mark);
        };

        propsPopup = new Drop({
          content: element.find('.shelf-properties')[0],
          target: element.find('.shelf-label')[0],
          position: 'bottom left',
          openOn: 'click'
        });

        scope.fieldInfoPopupContent =  element.find('.shelf-functions')[0];

        scope.removeField = function() {
          Pills.remove(scope.channelId);
        };

        scope.fieldDragStart = function() {
          Pills.dragStart(Pills.get(scope.channelId), scope.channelId);
        };

        scope.fieldDragStop = function() {
          Pills.dragStop();
        };

        /**
         * Event handler for dropping pill.
         */
        scope.fieldDropped = function() {
          var pill = Pills.get(scope.channelId);

          // validate type
          var types = Schema.schema.definitions.Type.enum;
          if (!_.includes(types, pill.type) && !cql.enumSpec.isEnumSpec(pill.type)) {
            // if existing type is not supported
            pill.type = types[0];
          }

          // TODO validate timeUnit / aggregate

          Pills.dragDrop(scope.channelId);
          Logger.logInteraction(Logger.actions.FIELD_DROP, pill);
        };

        var channelIdWatcher = scope.$watch('channelId', function(channelId) {
          scope.isAnyChannel = Pills.isAnyChannel(channelId);
        }, true);

        // FIXME: remove this confusing 2-way binding logics
        // If some external action changes the fieldDef, we also need to update the pill
        var channelEncodingWatcher = scope.$watch('encoding[channelId]', function(fieldDef) {
          // Preview shelf should not cause side effect
          if (scope.preview) {
            scope.isEnumeratedField = Pills.isEnumeratedField(scope.channelId);
            scope.isEnumeratedChannel = Pills.isEnumeratedChannel(scope.channelId);
          } else {
            Pills.set(scope.channelId, fieldDef ? _.cloneDeep(fieldDef) : {});
            scope.isAnyField = cql.enumSpec.isEnumSpec(fieldDef.field);
          }
        }, true);

        scope.$watchGroup(['allowedCasting[Dataset.schema.type(encoding[channelId].field)]', 'encoding[channel].aggregate'], function(arr){
          var allowedTypes = arr[0], aggregate=arr[1];
          scope.allowedTypes = aggregate === 'count' ? [vl.type.QUANTITATIVE] : allowedTypes;
        });

        scope.$on('$destroy', function() {
          if (propsPopup && propsPopup.destroy) {
            propsPopup.destroy();
          }

          // Clean up watchers
          channelIdWatcher();
          channelEncodingWatcher();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('fieldInfo', ['ANY', 'Drop', 'vl', 'cql', function (ANY, Drop, vl, cql) {
    return {
      templateUrl: 'components/fieldinfo/fieldinfo.html',
      restrict: 'E',
      replace: true,
      scope: {
        fieldDef: '<',
        showAdd: '<',
        showCaret: '<',
        showRemove: '<',
        showType: '<',
        popupContent: '<',

        action: '&',
        addAction: '&',
        removeAction: '&',
        disableCountCaret: '<',
      },
      link: function(scope, element) {
        var funcsPopup;
        scope.vlType = vl.type;
        scope.isEnumSpec = cql.enumSpec.isEnumSpec;

        // Properties that are created by a watcher later
        scope.typeName = null;
        scope.icon = null;
        scope.null = null;

        scope.clicked = function($event){
          if(scope.action && $event.target !== element.find('.fa-caret-down')[0] &&
            $event.target !== element.find('span.type')[0]) {
            scope.action($event);
          }
        };

        scope.func = function(fieldDef) {
          return fieldDef.aggregate || fieldDef.timeUnit ||
            (fieldDef.bin && 'bin') ||
            fieldDef._aggregate || fieldDef._timeUnit ||
            (fieldDef._bin && 'bin') || (fieldDef._any && 'auto');
        };

        var popupContentWatcher = scope.$watch('popupContent', function(popupContent) {
          if (!popupContent) { return; }

          if (funcsPopup) {
            funcsPopup.destroy();
          }

          funcsPopup = new Drop({
            content: popupContent,
            target: element.find('.type-caret')[0],
            position: 'bottom left',
            openOn: 'click'
          });
        });

        var TYPE_NAMES = {
          nominal: 'text',
          ordinal: 'text-ordinal',
          quantitative: 'number',
          temporal: 'time',
          geographic: 'geo'
        };

        var TYPE_ICONS = {
          nominal: 'fa-font',
          ordinal: 'fa-font',
          quantitative: 'icon-hash',
          temporal: 'fa-calendar',
        };
        TYPE_ICONS[ANY] = 'fa-asterisk'; // separate line because we might change what's the string for ANY

        function getTypeDictValue(type, dict) {
          if (cql.enumSpec.isEnumSpec(type)) { // is enumSpec
            var val = null;
            for (var i = 0; i < type.enum.length; i++) {
              var _type = type.enum[i];
              if (val === null) {
                val = dict[_type];
              } else {
                if (val !== dict[_type]) {
                  return ANY; // If there are many conflicting types
                }
              }
            }
            return val;
          }
          return dict[type];
        }

        var fieldDefWatcher = scope.$watch('fieldDef', function(fieldDef) {
          scope.icon = getTypeDictValue(fieldDef.type, TYPE_ICONS);
          scope.typeName = getTypeDictValue(fieldDef.type, TYPE_NAMES);
        });

        scope.$on('$destroy', function() {
          if (funcsPopup && funcsPopup.destroy) {
            funcsPopup.destroy();
          }

          // unregister watchers
          popupContentWatcher();
          fieldDefWatcher();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('functionSelect', ['_', 'consts', 'vl', 'Pills', 'Logger', 'Dataset', function(_, consts, vl, Pills, Logger, Dataset) {
    return {
      templateUrl: 'components/functionselect/functionselect.html',
      restrict: 'E',
      scope: {
        channelId: '<',
        fieldDef: '='
      },
      link: function(scope /*,element, attrs*/) {
        var BIN='bin', COUNT='count', maxbins;

        scope.func = {
          selected: undefined,
          list: {
            aboveFold: [],
            belowFold: [] // could be empty
          },
          isTemporal: false, // for making belowFold timeUnits single-column
          isCount: false // hide "more" & "less" toggle for COUNT
        };

        // functions for T = timeUnits + undefined
        var temporalFunctions = {
          aboveFold: [
            undefined, 'year',
            'quarter', 'month',
            'date','day',
            'hours', 'minutes',
            'seconds', 'milliseconds',
            'yearmonthdate'
          ],
          belowFold: [
            'yearquarter',
            'yearmonth',
            'yearmonthdatehours',
            'yearmonthdatehoursminutes',
            'yearmonthdatehoursminutesseconds',
            'hoursminutes',
            'hoursminutesseconds',
            'minutesseconds',
            'secondsmilliseconds'
          ]
        };

        var cardinalityFilter = function(timeUnit) {

          var pill =  Pills.get(scope.channelId);
          if (!pill) {
            return true;
          }
          var field = pill.field;
          // Convert 'any' channel to '?'.
          var channel = Pills.isAnyChannel(scope.channelId) ? '?' : scope.channelId;
          return !timeUnit || // Don't filter undefined.
            // Remove timeUnits that do not have variation (cardinality <= 1).
            Dataset.schema.timeUnitHasVariation({field: field, channel: channel, timeUnit: timeUnit});
        };

        // timeUnits = T functions - undefined
        var timeUnits = _.pull(_.concat(temporalFunctions.aboveFold, temporalFunctions.belowFold), undefined);

        // functions for Q = aggregates + BIN + undefined - COUNT
        var quantitativeFunctions = {
          aboveFold: [
            undefined, 'bin',
            'min', 'max',
            'mean', 'median',
            'sum'
          ],
          belowFold: [
            'valid', 'missing',
            'distinct', 'modeskew',
            'q1', 'q3',
            'stdev', 'stdevp',
            'variance', 'variancep'
          ] // hide COUNT for Q in the UI because we dedicate it to a special "# Count" field
        };

        // aggregates = Q Functions + COUNT - BIN - undefined
        var aggregates = _.pull(_.concat(quantitativeFunctions.aboveFold, quantitativeFunctions.belowFold, [COUNT]),
          BIN, undefined);

        scope.selectChanged = function() {
          Logger.logInteraction(Logger.actions.FUNC_CHANGE, scope.func.selected);

          var selectedFunc = scope.func.selected;

          var oldPill = Pills.get(scope.channelId),
            pill = _.clone(oldPill),
            type = pill ? pill.type : '',
            isQ = type === vl.type.QUANTITATIVE,
            isT = type === vl.type.TEMPORAL;

          if(!pill){
            return; // not ready
          }

          // reset field def
          // HACK: we're temporarily storing the maxbins in the pill
          pill.bin = selectedFunc === BIN ? {} : undefined;
          pill.aggregate = (isQ && aggregates.indexOf(selectedFunc) !== -1) ? selectedFunc : undefined;
          pill.timeUnit = (isT && timeUnits.indexOf(selectedFunc) !== -1) ? selectedFunc : undefined;

          if(!_.isEqual(oldPill, pill)){
            Pills.set(scope.channelId, pill, true /* propagate change */);
          }
        };

        // when parent objects modify the field
        var fieldDefWatcher = scope.$watch('fieldDef', function(pill) {
          if (!pill) {
            return;
          }

          var type = pill.field ? pill.type : '';

          // hack: save the maxbins
          if (pill.bin) {
            maxbins = pill.bin.maxbins;
          }

          var isOrdinalShelf = ['row','column','shape'].indexOf(scope.channelId) !== -1,
            isQ = type === vl.type.QUANTITATIVE,
            isT = type === vl.type.TEMPORAL;

          // for making belowFold timeUnits single-column
          scope.func.isTemporal = isT;

          // hide "more" & "less" toggles for COUNT
          scope.func.isCount = pill.field === '*';

          if(pill.field === '*' && pill.aggregate === COUNT){
            scope.func.list.aboveFold=[COUNT];
            scope.func.list.belowFold=[];
            scope.func.selected = COUNT;
          } else {
            // TODO: check supported type based on primitive data?
            if (isT) {
              scope.func.list.aboveFold = temporalFunctions.aboveFold.filter(cardinalityFilter);
              scope.func.list.belowFold = temporalFunctions.belowFold.filter(cardinalityFilter);
            }
            else if (isQ) {
              scope.func.list.aboveFold = quantitativeFunctions.aboveFold;
              scope.func.list.belowFold = quantitativeFunctions.belowFold;
            }

            var defaultVal = (isOrdinalShelf &&
              (isQ && BIN) || (isT && consts.defaultTimeFn)
            ) || undefined;

            var selected = pill.bin ? 'bin' :
              pill.aggregate || pill.timeUnit;

            if (scope.func.list.aboveFold.indexOf(selected) >= 0 || scope.func.list.belowFold.indexOf(selected) >= 0) {
              scope.func.selected = selected;
            } else {
              scope.func.selected = defaultVal;
            }
          }
        }, true);

        scope.$on('$destroy', function() {
          // Clean up watcher(s)
          fieldDefWatcher();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modal
 * @description
 * # modal
 */
angular.module('vlui')
  .directive('modal', ['$document', 'Modals', function ($document, Modals) {
    return {
      templateUrl: 'components/modal/modal.html',
      restrict: 'E',
      transclude: true,
      scope: {
        autoOpen: '<',
        maxWidth: '@'
      },
      // Provide an interface for child directives to close this modal
      controller: ['$scope', function($scope) {
        this.close = function() {
          $scope.isOpen = false;
        };
      }],
      link: function(scope, element, attrs) {
        var modalId = attrs.id;

        if (scope.maxWidth) {
          scope.wrapperStyle = 'max-width:' + scope.maxWidth;
        }

        // Default to closed unless autoOpen is set
        scope.isOpen = scope.autoOpen;

        // close on esc
        function escape(e) {
          if (e.keyCode === 27 && scope.isOpen) {
            scope.isOpen = false;
            scope.$digest();
          }
        }

        angular.element($document).on('keydown', escape);

        // Register this modal with the service
        Modals.register(modalId, scope);
        scope.$on('$destroy', function() {
          Modals.deregister(modalId);
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modalCloseButton
 * @description
 * # modalCloseButton
 */
angular.module('vlui')
  .directive('modalCloseButton', function() {
    return {
      templateUrl: 'components/modal/modalclosebutton.html',
      restrict: 'E',
      require: '^^modal',
      scope: {
        closeAction: '&'
      },
      link: function(scope, element, attrs, modalController) {
        scope.closeModal = function() {
          modalController.close();
          if (scope.closeAction) {
            scope.closeAction();
          }
        };
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Modals
 * @description
 * # Modals
 * Service used to control modal visibility from anywhere in the application
 */
angular.module('vlui')
  .factory('Modals', ['$cacheFactory', function ($cacheFactory) {

    // TODO: The use of scope here as the method by which a modal directive
    // is registered and controlled may need to change to support retrieving
    // data from a modal as may be needed in #77
    var modalsCache = $cacheFactory('modals');

    // Public API
    return {
      register: function(id, scope) {
        if (modalsCache.get(id)) {
          console.error('Cannot register two modals with id ' + id);
          return;
        }
        modalsCache.put(id, scope);
      },

      deregister: function(id) {
        modalsCache.remove(id);
      },

      // Open a modal
      open: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = true;
      },

      // Close a modal
      close: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = false;
      },

      empty: function() {
        modalsCache.removeAll();
      },

      count: function() {
        return modalsCache.info().size;
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:propertyEditor
 * @description
 * # propertyEditor
 */
angular.module('vlui')
  .directive('propertyEditor', function () {
    return {
      templateUrl: 'components/propertyeditor/propertyeditor.html',
      restrict: 'E',
      scope: {
        id: '=',
        type: '=',
        enum: '=',
        propName: '=',
        group: '=',
        description: '=',
        default: '=',
        min: '=',
        max: '=',
        role: '=' // for example 'color'
      },
      link: function postLink(scope /*, element, attrs*/) {
        scope.hasAuto = scope.default === undefined;

        //TODO(kanitw): consider renaming
        scope.automodel = { value: false };

        if (scope.hasAuto) {
          scope.automodel.value = scope.group[scope.propName] === undefined;

          // change the value to undefined if auto is true
          var autoModelWatcher = scope.$watch('automodel.value', function() {
            if (scope.automodel.value === true) {
              scope.group[scope.propName] = undefined;
            }
          });

          scope.$on('$destroy', function() {
            // Clean up watcher
            autoModelWatcher();
          });

        }

        scope.isRange = scope.max !== undefined && scope.min !== undefined;
      }
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('schemaList', function() {
    return {
      templateUrl: 'components/schemalist/schemalist.html',
      restrict: 'E',
      scope: {
        orderBy: '<',
        fieldDefs: '<',
        showAdd: '<'
      },
      replace: true
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name polestar.directive:schemaListItem
 * @description
 * # schemaListItem
 */
angular.module('vlui')
  .directive('schemaListItem', ['Pills', 'cql', function (Pills, cql) {
    return {
      templateUrl: 'components/schemalist/schemalistitem.html',
      restrict: 'E',
      replace: false,
      scope: {
        fieldDef: '=', // TODO: determine if it's one way
        showAdd:  '<',
      },
      link: function postLink(scope) {
        scope.isEnumSpec = cql.enumSpec.isEnumSpec;

        scope.fieldAdd = function(fieldDef) {
          Pills.add(fieldDef);
        };

        scope.fieldDragStart = function() {
          var fieldDef = scope.fieldDef;

          scope.pill = {
            field: fieldDef.field,
            title: fieldDef.title,
            type: fieldDef.type,
            aggregate: fieldDef.aggregate
          };
          Pills.dragStart(scope.pill, null);
        };

        scope.fieldDragStop = Pills.dragStop;
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('shelves', function() {

    return {
      templateUrl: 'components/shelves/shelves.html',
      restrict: 'E',
      scope: {
        spec: '=',
        preview: '<',
        supportAny: '<'
      },
      replace: true,
      controller: ['$scope', 'ANY', 'util', 'vl', 'Config', 'Dataset', 'Logger', 'Pills', function($scope, ANY, util, vl, Config, Dataset, Logger, Pills) {
        $scope.ANY = ANY;
        $scope.anyChannelIds = [];

        $scope.marks = ['point', 'tick', 'bar', 'line', 'area', 'text'];
        $scope.marksWithAny = [ANY].concat($scope.marks);

        $scope.markChange = function() {
          Logger.logInteraction(Logger.actions.MARK_CHANGE, $scope.spec.mark);
        };

        $scope.transpose = function(){
          vl.spec.transpose($scope.spec);
        };

        $scope.clear = function(){
          Logger.logInteraction(Logger.actions.SPEC_CLEAN, $scope.spec);
          Pills.reset();
        };

        var specWatcher = $scope.$watch('spec', function(spec) {
          // populate anyChannelIds so we show all or them
          if ($scope.supportAny) {
            $scope.anyChannelIds = util.keys(spec.encoding).reduce(function(anyChannelIds, channelId) {
              if (Pills.isAnyChannel(channelId)) {
                anyChannelIds.push(channelId);
              }
              return anyChannelIds;
            }, []);
          }
          // Only call Pills.update, which will trigger Spec.spec to update if it's not a preview.
          if (!$scope.preview) {
            Logger.logInteraction(Logger.actions.SPEC_CHANGE, spec);
            Pills.update(spec);
          }
        }, true); //, true /* watch equality rather than reference */);


        $scope.$on('$destroy', function() {
          // Clean up watcher
          specWatcher();
        });
      }]
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tab
 * @description
 * # tab
 */
angular.module('vlui')
  .directive('tab', function() {
    return {
      templateUrl: 'components/tabs/tab.html',
      restrict: 'E',
      require: '^^tabset',
      replace: true,
      transclude: true,
      scope: {
        heading: '@'
      },
      link: function(scope, element, attrs, tabsetController) {
        tabsetController.addTab(scope);
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tabset
 * @description
 * # tabset
 */
angular.module('vlui')
  .directive('tabset', function() {
    return {
      templateUrl: 'components/tabs/tabset.html',
      restrict: 'E',
      transclude: true,

      // Interface for tabs to register themselves
      controller: function() {
        var self = this;

        this.tabs = [];

        this.addTab = function(tabScope) {
          // First tab is always auto-activated; others auto-deactivated
          tabScope.active = self.tabs.length === 0;
          self.tabs.push(tabScope);
        };

        this.showTab = function(selectedTab) {
          self.tabs.forEach(function(tab) {
            // Activate the selected tab, deactivate all others
            tab.active = tab === selectedTab;
          });
        };
      },

      // Expose controller to templates as "tabset"
      controllerAs: 'tabset'
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('vlPlot', ['vl', 'vg', 'cql', '$timeout', '$q', 'Dataset', 'Config', 'consts', '_', '$document', 'Logger', 'Heap', '$window', function(vl, vg, cql, $timeout, $q, Dataset, Config, consts, _, $document, Logger, Heap, $window) {
    var counter = 0;
    var MAX_CANVAS_SIZE = 32767/2, MAX_CANVAS_AREA = 268435456/4;

    var renderQueue = new Heap(function(a, b){
        return a.priority - b.priority;
      }),
      rendering = false;

    function getRenderer(width, height) {
      // use canvas by default but use svg if the visualization is too big
      if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE || width*height > MAX_CANVAS_AREA) {
        return 'svg';
      }
      return 'canvas';
    }

    return {
      templateUrl: 'components/vlplot/vlplot.html',
      restrict: 'E',
      scope: {
        chart: '=',

        //optional
        disabled: '<',
        /** A function that returns if the plot is still in the view, so it might be omitted from the render queue if necessary. */
        isInList: '<',
        listTitle: '<',

        alwaysScrollable: '<',
        configSet: '@',
        maxHeight:'<',
        maxWidth: '<',
        overflow: '<',
        priority: '<',
        rescale: '<',
        thumbnail: '<',
        tooltip: '<',
      },
      replace: true,
      link: function(scope, element) {
        var HOVER_TIMEOUT = 500,
          TOOLTIP_TIMEOUT = 250;

        var view;

        function destroyView() {
          if (view) {
            view.off('mouseover');
            view.off('mouseout');
            view.destroy();
            view = null;

            var shorthand = getShorthand();
            if (consts.debug && $window.views) {
              delete $window.views[shorthand];
            }
          }
        }

        scope.visId = (counter++);

        var hoverPromise = null;
        var tooltipPromise = null;
        var renderQueueNextPromise = null;

        scope.hoverFocus = false;
        scope.tooltipActive = false;
        scope.destroyed = false;



        var format = vg.util.format.number('');

        scope.mouseover = function() {
          hoverPromise = $timeout(function(){
            Logger.logInteraction(Logger.actions.CHART_MOUSEOVER, scope.chart.shorthand,{
              list: scope.listTitle
            });
            scope.hoverFocus = !scope.thumbnail;
          }, HOVER_TIMEOUT);
        };

        scope.mouseout = function() {
          if (scope.hoverFocus) {
            Logger.logInteraction(Logger.actions.CHART_MOUSEOUT, scope.chart.shorthand, {
              list: scope.listTitle
            });
          }

          $timeout.cancel(hoverPromise);
          hoverPromise = null;

          scope.hoverFocus = scope.unlocked = false;
        };

        function viewOnMouseOver(event, item) {
          if (!item || !item.datum) {
            return;
          }

          tooltipPromise = $timeout(function activateTooltip(){

            // avoid showing tooltip for facet's background
            if (item.datum._facetID) {
              return;
            }

            scope.tooltipActive = true;
            Logger.logInteraction(Logger.actions.CHART_TOOLTIP, item.datum, {
              shorthand: scope.chart.shorthand,
              list: scope.listTitle
            });

            // convert data into a format that we can easily use with ng table and ng-repeat
            // TODO: revise if this is actually a good idea
            scope.data = _(item.datum).omit('_prev', '_id') // omit vega internals
              .toPairs().value()
              .map(function(p) {
                p[1] = vg.util.isNumber(p[1]) ? format(p[1]) : p[1];
                return p;
              });
            scope.$digest();

            var tooltip = element.find('.vis-tooltip'),
              $body = angular.element($document),
              width = tooltip.width(),
              height= tooltip.height();

            // put tooltip above if it's near the screen's bottom border
            if (event.pageY+10+height < $body.height()) {
              tooltip.css('top', (event.pageY+10));
            } else {
              tooltip.css('top', (event.pageY-10-height));
            }

            // put tooltip on left if it's near the screen's right border
            if (event.pageX+10+ width < $body.width()) {
              tooltip.css('left', (event.pageX+10));
            } else {
              tooltip.css('left', (event.pageX-10-width));
            }
          }, TOOLTIP_TIMEOUT);
        }

        function viewOnMouseOut(event, item) {
          //clear positions
          var tooltip = element.find('.vis-tooltip');
          tooltip.css('top', null);
          tooltip.css('left', null);
          $timeout.cancel(tooltipPromise);
          tooltipPromise = null;

          if (scope.tooltipActive) {
            Logger.logInteraction(Logger.actions.CHART_TOOLTIP_END, item.datum, {
              shorthand: scope.chart.shorthand,
              list: scope.listTitle
            });
          }
          scope.tooltipActive = false;
          scope.data = [];
          scope.$digest();
        }

        function getVgSpec() {
          var configSet = scope.configSet || consts.defaultConfigSet || {};

          if (!scope.chart.vlSpec) {
            return;
          }

          var vlSpec = _.cloneDeep(scope.chart.vlSpec);
          vg.util.extend(vlSpec.config, Config[configSet]());
          return vl.compile(vlSpec).spec;
        }

        function getVisElement() {
          return element.find('.vega > :first-child');
        }

        function rescaleIfEnable() {
          var visElement = getVisElement();
          if (scope.rescale) {
            // have to digest the scope to ensure that
            // element.width() is bound by parent element!
            scope.$digest();

            var xRatio = Math.max(
                0.2,
                element.width() /  /* width of vlplot bounding box */
                scope.width /* width of the vis */
              );

            if (xRatio < 1) {
              visElement.width(scope.width * xRatio)
                        .height(scope.height * xRatio);
            }

          } else {
            visElement.css('transform', null)
                      .css('transform-origin', null);
          }
        }

        function getShorthand() {
          return scope.chart.shorthand || (scope.chart.vlSpec ? cql.query.shorthand.vlSpec(scope.chart.vlSpec) : '');
        }

        function renderQueueNext() {
          // render next item in the queue
          if (renderQueue.size() > 0) {
            var next = renderQueue.pop();
            next.parse();
          } else {
            // or say that no one is rendering
            rendering = false;
          }
        }


        function render(spec) {

          if (!spec) {
            if (view) {
              destroyView();
            }
            return;
          }

          scope.height = spec.height;
          if (!element) {
            console.error('can not find vis element');
          }

          var shorthand = getShorthand();

          function parseVega() {
            // if no longer a part of the list, cancel!
            if (scope.destroyed || scope.disabled || (scope.isInList && scope.chart.fieldSetKey && !scope.isInList(scope.chart))) {
              console.log('cancel rendering', shorthand);
              renderQueueNext();
              return;
            }

            var start = new Date().getTime();
            // render if still a part of the list
            vg.parse.spec(spec, function(error, chart) {
              if (error) {
                console.error('error', error);
                renderQueueNextPromise = $timeout(renderQueueNext, 1);
                return;
              }
              try {
                var endParse = new Date().getTime();
                destroyView();
                view = chart({el: element[0]});

                if (!consts.useUrl) {
                  view.data({raw: Dataset.data});
                }

                view.update();
                // read width / height from layout
                var layout = view.data('layout').values()[0];
                var renderer = getRenderer(layout.width, layout.height);
                if (renderer === 'svg') {
                  view.renderer(renderer);
                }

                var visElement = element.find('.vega > :first-child');
                // read  <canvas>/<svg>’s width and height, which is vega's outer width and height that includes axes and legends
                scope.width =  visElement.width();
                scope.height = visElement.height();

                if (consts.debug) {
                  $window.views = $window.views || {};
                  $window.views[shorthand] = view;
                }

                Logger.logInteraction(Logger.actions.CHART_RENDER, scope.chart.shorthand, {
                  list: scope.listTitle
                });
                rescaleIfEnable();

                var endChart = new Date().getTime();
                console.log('parse spec', (endParse-start), 'charting', (endChart-endParse), shorthand);
                if (scope.tooltip) {
                  view.on('mouseover', viewOnMouseOver);
                  view.on('mouseout', viewOnMouseOut);
                }
              } catch (e) {
                console.error(e, JSON.stringify(spec));
              } finally {
                renderQueueNextPromise = $timeout(renderQueueNext, 1);
              }

            });
          }

          if (!rendering) { // if no instance is being render -- rendering now
            rendering=true;
            parseVega();
          } else {
            // otherwise queue it
            renderQueue.push({
              priority: scope.priority || 0,
              parse: parseVega
            });
          }
        }

        var specWatcher = scope.$watch(function() {
          // Omit data property to speed up deep watch
          return _.omit(scope.chart.vlSpec, 'data');
        }, function() {
          var spec = scope.chart.vgSpec = getVgSpec();
          if (!scope.chart.cleanSpec) {
            // FIXME
            scope.chart.cleanSpec = scope.chart.vlSpec;
          }
          render(spec);
        }, true);

        scope.$on('$destroy', function() {
          console.log('vlplot destroyed');
          if (view) {
            destroyView();
          }

          if (hoverPromise) {
            $timeout.cancel(hoverPromise);
            hoverPromise = null;
          }

          if (tooltipPromise) {
            $timeout.cancel(tooltipPromise);
            tooltipPromise = null;
          }

          // if (renderQueueNextPromise) {
          //   $timeout.cancel(renderQueueNextPromise);
          //   renderQueueNextPromise = null;
          // }

          scope.destroyed = true;
          // FIXME another way that should eliminate things from memory faster should be removing
          // maybe something like
          // renderQueue.splice(renderQueue.indexOf(parseVega), 1));
          // but without proper testing, this is riskier than setting scope.destroyed.

          // Clean up watcher
          specWatcher();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroup', ['Bookmarks', 'consts', 'vg', 'vl', 'Dataset', 'Logger', '_', 'Pills', 'Chart', '$timeout', function (Bookmarks, consts, vg, vl, Dataset, Logger, _, Pills, Chart, $timeout) {
    return {
      templateUrl: 'components/vlplotgroup/vlplotgroup.html',
      restrict: 'E',
      replace: true,
      controller: ['$scope', '$element', function($scope, $element) {
        this.getDropTarget = function() {
          return $element.find('.fa-wrench')[0];
        };
      }],
      scope: {
        /* pass to vlplot **/
        chart: '=',

        //optional
        disabled: '<',
        isInList: '<',
        listTitle: '<',

        alwaysScrollable: '<',
        configSet: '@',
        enablePillsPreview: '<',
        maxHeight: '<',
        maxWidth: '<',
        overflow: '<',
        priority: '<',
        rescale: '<',
        thumbnail: '<',
        tooltip: '<',

        /* vlplotgroup specific */

        /** Set of fieldDefs for showing field info.  For Voyager2, this might be just a subset of fields that are ambiguous. */
        fieldSet: '<',

        showBookmark: '<',
        showDebug: '<',
        showExpand: '<',
        showFilterNull: '<',
        showLabel: '<',
        showLog: '<',
        showSelect: '<',
        showSort: '<',
        showTranspose: '<',

        /** Whether the log / transpose sort cause side effect to the shelf  */
        toggleShelf: '<',

        alwaysSelected: '<',
        isSelected: '<',
        highlighted: '<',
        expandAction: '&',
        selectAction: '&'
      },
      link: function postLink(scope) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
        scope.hovered = false;

        // bookmark alert
        scope.showBookmarkAlert = false;
        scope.toggleBookmark = function(chart) {
          if (Bookmarks.isBookmarked(chart.shorthand)) {
            scope.showBookmarkAlert = !scope.showBookmarkAlert; // toggle alert
          }
          else {
            Bookmarks.add(chart, scope.listTitle);
          }
        };

        var hoverPromise = null;

        scope.fieldInfoMouseover = function(fieldDef, index) {
          scope.hovered = true;

          hoverPromise = $timeout(function() {
            (scope.highlighted||{})[fieldDef.field] = true;

            // Link to original field in the CQL-based spec
            if (scope.chart.enumSpecIndex) {
              var enumSpecIndex = scope.chart.enumSpecIndex;
              if (enumSpecIndex.encodings && enumSpecIndex.encodings[index] && enumSpecIndex.encodings[index].field) {
                var fieldEnumSpecName = enumSpecIndex.encodings[index].field.name;
                (scope.highlighted||{})[fieldEnumSpecName] = true;
              }
            }

            Logger.logInteraction(Logger.actions.FIELDDEF_HIGHLIGHTED, scope.chart.shorthand, {
              highlightedField: fieldDef.field,
              list: scope.listTitle
            });

            if (scope.enablePillsPreview) {
              Pills.preview(scope.chart.vlSpec);
            }
          }, 500);
        };

        scope.fieldInfoMouseout = function(fieldDef, index) {
          scope.hovered = false;

          if (hoverPromise) {
            // if we unhover within
            $timeout.cancel(hoverPromise);
          }
          hoverPromise = null;

          if ((scope.highlighted||{})[fieldDef.field]) {
            // disable preview if it's enabled
            Logger.logInteraction(Logger.actions.FIELDDEF_UNHIGHLIGHTED, scope.chart.shorthand, {
              highlightedField: fieldDef.field,
              list: scope.listTitle
            });

            (scope.highlighted||{})[fieldDef.field] = false;

            // Unlink Link to original field in the CQL-based spec
            if (scope.chart.enumSpecIndex) {
              var enumSpecIndex = scope.chart.enumSpecIndex;
              if (enumSpecIndex.encodings && enumSpecIndex.encodings[index] && enumSpecIndex.encodings[index].field) {
                var fieldEnumSpecName = enumSpecIndex.encodings[index].field.name;
                delete (scope.highlighted||{})[fieldEnumSpecName];
              }
            }

            if (scope.enablePillsPreview) {
              Pills.preview(null);
            }
          }
        };

        scope.isEnumeratedField = function(chart, index) {
          if (chart.enumSpecIndex) {
            if (chart.enumSpecIndex.encodings && chart.enumSpecIndex.encodings[index]) {
              return chart.enumSpecIndex.encodings[index].field;
            }
          }
          return false;
        };

        scope.isEnumeratedChannel = function(chart, index) {
          if (chart.enumSpecIndex) {
            if (chart.enumSpecIndex.encodings && chart.enumSpecIndex.encodings[index]) {
              return chart.enumSpecIndex.encodings[index].channel;
            }
          }
          return false;
        };

        scope.removeBookmark = function(chart) {
          Bookmarks.remove(chart);
          scope.showBookmarkAlert = false;
        };

        scope.keepBookmark = function() {
          scope.showBookmarkAlert = false;
        };

        // Defer rendering the debug Drop popup until it is requested
        scope.renderPopup = false;
        // Use _.once because the popup only needs to be initialized once
        scope.initializePopup = _.once(function() {
          scope.renderPopup = true;
        });

        scope.logCode = function(name, value) {
          console.log(name+':\n\n', JSON.stringify(value));
        };

        // TOGGLE LOG

        scope.log = {};
        scope.log.support = function(spec, channel) {
          if (!spec) { return false; }
          var encoding = spec.encoding,
            fieldDef = encoding[channel];

          return fieldDef && fieldDef.type === vl.type.QUANTITATIVE && !fieldDef.bin;
        };

        scope.log.toggle = function(spec, channel) {
          if (!scope.log.support(spec, channel)) { return; }

          var fieldDef = spec.encoding[channel],
            scale = fieldDef.scale = fieldDef.scale || {};

          if (scope.toggleShelf) {
            Pills.rescale(channel, scale.type === 'log' ? 'linear' : 'log');
          } else {
            scale.type = scale.type === 'log' ? 'linear' : 'log';
          }

          Logger.logInteraction(Logger.actions.LOG_TOGGLE, scope.chart.shorthand, {
            list: scope.listTitle
          });
        };

        scope.log.active = function(spec, channel) {
          if (!scope.log.support(spec, channel)) { return; }

          var fieldDef = spec.encoding[channel],
            scale = fieldDef.scale;

          return scale && scale.type === 'log';
        };

        // TOGGLE FILTER
        // TODO: extract toggleFilterNull to be its own class

        scope.toggleFilterNull = function(spec) {
          Logger.logInteraction(Logger.actions.NULL_FILTER_TOGGLE, scope.chart.shorthand, {
            list: scope.listTitle
          });

          if (scope.toggleShelf) {
            Pills.toggleFilterInvalid();
          } else {
            spec.transform = spec.transform || {};
            spec.transform.filterInvalid = spec.transform.filterInvalid === true ? undefined : true;
          }
        };

        scope.toggleFilterNull.support = function(spec) {
          var fieldDefs = vl.spec.fieldDefs(spec);
          for (var i in fieldDefs) {
            var fieldDef = fieldDefs[i];
            if (_.includes([vl.type.ORDINAL, vl.type.NOMINAL], fieldDef.type) && Dataset.schema.stats(fieldDef).missing > 0) {
              return true;
            }
          }
          return false;
        };

        // TOGGLE SORT
        // TODO: extract toggleSort to be its own class

        var toggleSort = scope.toggleSort = {};

        toggleSort.modes = ['ordinal-ascending', 'ordinal-descending',
          'quantitative-ascending', 'quantitative-descending', 'custom'];

        toggleSort.toggle = function(spec) {

          var currentMode = toggleSort.mode(spec);
          var currentModeIndex = toggleSort.modes.indexOf(currentMode);

          var newModeIndex = (currentModeIndex + 1) % (toggleSort.modes.length - 1);
          var newMode = toggleSort.modes[newModeIndex];

          Logger.logInteraction(Logger.actions.SORT_TOGGLE, scope.chart.shorthand, {
            currentMode: currentMode,
            newMode: newMode,
            list: scope.listTitle
          });

          var channels = toggleSort.channels(spec);

          if (scope.toggleShelf) {
            Pills.sort(channels.ordinal, toggleSort.getSort(newMode, spec));
          } else {
            spec.encoding[channels.ordinal].sort = toggleSort.getSort(newMode, spec);
          }
        };

        /** Get sort property definition that matches each mode. */
        toggleSort.getSort = function(mode, spec) {
          if (mode === 'ordinal-ascending') {
            return 'ascending';
          }

          if (mode === 'ordinal-descending') {
            return 'descending';
          }

          var channels = toggleSort.channels(spec);
          var qEncDef = spec.encoding[channels.quantitative];

          if (mode === 'quantitative-ascending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.field,
              order: 'ascending'
            };
          }

          if (mode === 'quantitative-descending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.field,
              order: 'descending'
            };
          }

          return null;
        };

        toggleSort.mode = function(spec) {
          var channels = toggleSort.channels(spec);
          var sort = spec.encoding[channels.ordinal].sort;

          if (sort === undefined) {
            return 'ordinal-ascending';
          }

          for (var i = 0; i < toggleSort.modes.length - 1 ; i++) {
            // check if sort matches any of the sort for each mode except 'custom'.
            var mode = toggleSort.modes[i];
            var sortOfMode = toggleSort.getSort(mode, spec);

            if (_.isEqual(sort, sortOfMode)) {
              return mode;
            }
          }

          if (vg.util.isObject(sort) && sort.op && sort.field) {
            return 'custom';
          }
          console.error('invalid mode');
          return null;
        };

        toggleSort.channels = function(spec) {
          return spec.encoding.x.type === vl.type.NOMINAL || spec.encoding.x.type === vl.type.ORDINAL ?
                  {ordinal: 'x', quantitative: 'y'} :
                  {ordinal: 'y', quantitative: 'x'};
        };

        toggleSort.support = function(spec) {
          var encoding = spec.encoding;

          if (vl.encoding.has(encoding, 'row') || vl.encoding.has(encoding, 'column') ||
            !vl.encoding.has(encoding, 'x') || !vl.encoding.has(encoding, 'y') ||
            !vl.encoding.isAggregate(spec.encoding)) { // FIXME replace this proper alwaysNoOcclusion method
            return false;
          }

          return (
              (encoding.x.type === vl.type.NOMINAL || encoding.x.type === vl.type.ORDINAL) &&
              vl.fieldDef.isMeasure(encoding.y)
            ) ? 'x' :
            (
              (encoding.y.type === vl.type.NOMINAL || encoding.y.type === vl.type.ORDINAL) &&
              vl.fieldDef.isMeasure(encoding.x)
            ) ? 'y' : false;
        };

        scope.toggleSortClass = function(vlSpec) {
          if (!vlSpec || !toggleSort.support(vlSpec)) {
            return 'invisible';
          }

          var ordinalChannel = vlSpec && toggleSort.channels(vlSpec).ordinal,
            mode = vlSpec && toggleSort.mode(vlSpec);

          var directionClass = ordinalChannel === 'x' ? 'sort-x ' : '';

          switch (mode) {
            case 'ordinal-ascending':
              return directionClass + 'fa-sort-alpha-asc';
            case 'ordinal-descending':
              return directionClass + 'fa-sort-alpha-desc';
            case 'quantitative-ascending':
              return directionClass + 'fa-sort-amount-asc';
            case 'quantitative-descending':
              return directionClass + 'fa-sort-amount-desc';
            default: // custom
              return directionClass + 'fa-sort';
          }
        };

        scope.transpose = function() {
          Logger.logInteraction(Logger.actions.TRANSPOSE_TOGGLE, scope.chart.shorthand, {
            list: scope.listTitle
          });
          if (scope.toggleShelf) {
            Pills.transpose();
          } else {
            Chart.transpose(scope.chart.vlSpec);
          }
        };

        scope.$on('$destroy', function() {
          scope.chart = null;
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroupPopup', ['Drop', function (Drop) {
    return {
      templateUrl: 'components/vlplotgroup/vlplotgrouppopup.html',
      restrict: 'E',
      require: '^^vlPlotGroup',
      scope: false,
      link: function postLink(scope, element, attrs, vlPlotGroupController) {
        var debugPopup = new Drop({
          content: element.find('.dev-tool')[0],
          target: vlPlotGroupController.getDropTarget(),
          position: 'bottom right',
          openOn: 'click',
          constrainToWindow: true
        });

        scope.$on('$destroy', function() {
          debugPopup.destroy();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('vlPlotGroupList', ['vl', 'cql', 'jQuery', 'consts', '_', 'Logger', 'Pills', 'Chart', function (vl, cql, jQuery, consts, _, Logger, Pills, Chart) {
    return {
      templateUrl: 'components/vlplotgrouplist/vlplotgrouplist.html',
      restrict: 'E',
      replace: true,
      scope: {
        /** An instance of specQueryModelGroup */
        enablePillsPreview: '<',
        initialLimit: '<',
        listTitle: '<',
        hideListTitle: '<',
        charts: '<',
        priority: '<',
        showMore: '<',
        postSelectAction: '&'
      },
      link: function postLink(scope /*, element, attrs*/) {
        scope.consts = consts;
        scope.limit = scope.initialLimit || 3;

        // Functions
        scope.getChart = Chart.getChart;
        scope.increaseLimit = increaseLimit;
        scope.isInlist = isInList;
        scope.select = select;
        scope.Pills = Pills;

        // element.bind('scroll', function(){
        //    if(jQuery(this).scrollTop() + jQuery(this).innerHeight() >= jQuery(this)[0].scrollHeight){
        //     if (scope.limit < scope.modelGroup.charts.length) {
        //       scope.increaseLimit();
        //     }
        //    }
        // });

        function increaseLimit() {
          scope.limit += 5;
          Logger.logInteraction(Logger.actions.LOAD_MORE, scope.limit, {
            list: scope.listTitle
          });
        }

        /** return if the plot is still in the view, so it might be omitted from the render queue if necessary. */
        function isInList(chart) {
          for (var i = 0; i < scope.charts.length; i++) {
            if(chart.shorthand === scope.charts[i].shorthand) {
              return true;
            }
          }
          return false;
        }

        function select(chart) {
          Logger.logInteraction(Logger.actions.SPEC_SELECT, chart.shorthand, {
            list: scope.listTitle
          });
          Pills.parse(chart.vlSpec);
          if (scope.postSelectAction) {
            scope.postSelectAction();
          }
        }
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .filter('compactJSON', ['JSON3', function(JSON3) {
    return function(input) {
      return JSON3.stringify(input, null, '  ', 80);
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:encodeUri
 * @function
 * @description
 * # encodeUri
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('encodeURI', function () {
    return function (input) {
      return window.encodeURI(input);
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name facetedviz.filter:reportUrl
 * @function
 * @description
 * # reportUrl
 * Filter in the facetedviz.
 */
angular.module('vlui')
  .filter('reportUrl', ['compactJSONFilter', '_', 'consts', function (compactJSONFilter, _, consts) {
    function voyagerReport(params) {
      var url = 'https://docs.google.com/forms/d/1T9ZA14F3mmzrHR7JJVUKyPXzrMqF54CjLIOjv2E7ZEM/viewform?';

      if (params.fields) {
        var query = encodeURI(compactJSONFilter(_.values(params.fields)));
        url += 'entry.1245199477=' + query + '&';
      }

      if (params.spec) {
        var spec = _.omit(params.spec, 'config');
        spec = encodeURI(compactJSONFilter(spec));
        url += 'entry.1323680136=' + spec + '&';
      }

      if (params.spec2) {
        var spec2 = _.omit(params.spec2, 'config');
        spec2 = encodeURI(compactJSONFilter(spec2));
        url += 'entry.853137786=' + spec2 + '&';
      }

      var typeProp = 'entry.1940292677=';
      switch (params.type) {
        case 'vl':
          url += typeProp + 'Visualization+Rendering+(Vegalite)&';
          break;
        case 'vr':
          url += typeProp + 'Recommender+Algorithm+(Visrec)&';
          break;
        case 'fv':
          url += typeProp + 'Recommender+UI+(FacetedViz)&';
          break;

      }
      return url;
    }

    function vluiReport(params) {
      var url = 'https://docs.google.com/forms/d/1xKs-qGaLZEUfbTmhdmSoS13OKOEpuu_NNWE5TAAml_Y/viewform?';
      if (params.spec) {
        var spec = _.omit(params.spec, 'config');
        spec = encodeURI(compactJSONFilter(spec));
        url += 'entry.1245199477=' + spec + '&';
      }
      return url;
    }

    return consts.appId === 'voyager' ? voyagerReport : vluiReport;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:underscore2space
 * @function
 * @description
 * # underscore2space
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('underscore2space', function () {
    return function (input) {
      return input ? input.replace(/_+/g, ' ') : '';
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Alerts', ['$timeout', '_', function($timeout, _) {
    var Alerts = {};

    Alerts.alerts = [];

    Alerts.add = function(msg, dismiss) {
      var message = {msg: msg};
      Alerts.alerts.push(message);
      if (dismiss) {
        $timeout(function() {
          var index = _.findIndex(Alerts.alerts, message);
          Alerts.closeAlert(index);
        }, dismiss);
      }
    };

    Alerts.closeAlert = function(index) {
      Alerts.alerts.splice(index, 1);
    };

    return Alerts;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Bookmarks
 * @description
 * # Bookmarks
 * Service in the vlui.
 */
angular.module('vlui')
  .service('Bookmarks', ['_', 'vl', 'localStorageService', 'Logger', 'Dataset', function(_, vl, localStorageService, Logger, Dataset) {
    var Bookmarks = function() {
      this.list = [];
      this.dict = {};
      this.isSupported = localStorageService.isSupported;
    };

    var proto = Bookmarks.prototype;

    proto.save = function() {
      localStorageService.set('bookmarkList', this.list);
    };

    proto.saveAnnotations = function(shorthand) {
      _.find(this.list, function(bookmark) { return bookmark.shorthand === shorthand; })
        .chart.annotation = this.dict[shorthand].annotation;
      this.save();
    };

    // export all bookmarks and annotations
    proto.export = function() {
      var dictionary = this.dict;

      // prepare export data
      var exportSpecs = [];
      _.forEach(this.list, function(bookmark) {
        var spec = bookmark.chart.vlSpec;
        spec.description = dictionary[bookmark.shorthand].annotation;
        exportSpecs.push(spec);
      });

      // write export data in a new tab
      var exportWindow = window.open();
      exportWindow.document.open();
      exportWindow.document.write('<html><body><pre>' + JSON.stringify(exportSpecs, null, 2) + '</pre></body></html>');
      exportWindow.document.close();
    };

    proto.load = function() {
      this.list = localStorageService.get('bookmarkList') || [];

      // populate this.dict
      var dictionary = this.dict;
      _.forEach(this.list, function(bookmark) {
        dictionary[bookmark.shorthand] = _.cloneDeep(bookmark.chart);
      });
    };

    proto.clear = function() {
      this.list.splice(0, this.list.length);
      this.dict = {};
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_CLEAR);
    };

    proto.add = function(chart, listTitle) {
      var shorthand = chart.shorthand;
      chart.timeAdded = (new Date().getTime());

      // FIXME: this is not always a good idea
      chart.schema = Dataset.schema;

      this.dict[chart.shorthand] = _.cloneDeep(chart);

      this.list.push({
        shorthand: shorthand,
        list: listTitle,
        chart: _.cloneDeep(chart)
      });

      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_ADD, shorthand, {
        list: listTitle
      });
    };

    proto.remove = function(chart) {
      var shorthand = chart.shorthand;

      // remove bookmark from this.list
      var index = this.list.findIndex(function(bookmark) { return bookmark.shorthand === shorthand; });
      var removed;
      if (index >= 0) {
        removed = this.list.splice(index, 1)[0];
      }

      // remove bookmark from this.dict
      delete this.dict[chart.shorthand];

      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_REMOVE, shorthand, {
        list: (removed || {}).list
      });
    };

    proto.reorder = function() {
      this.save();
    };

    proto.isBookmarked = function(shorthand) {
      return this.dict.hasOwnProperty(shorthand);
    };

    proto.logBookmarksClosed = function() {
      Logger.logInteraction(Logger.actions.BOOKMARK_CLOSE);
    };

    return new Bookmarks();
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Chart', ['cql', '_', function (cql, _) {
    var Chart = {
      getChart: getChart,
      transpose: transpose
    };

    /**
     *
     * @param {SpecQueryModelGroup | SpecQueryModel} item
     */
    function getChart(item) {
      if (!item) {
        return {
          /** @type {Object} concise spec generated */
          vlSpec: null,
          fieldSet: null,

          /** @type {String} generated vl shorthand */
          shorthand: null,
          enumSpecIndex: null
        };
      }

      var specM = item instanceof cql.model.SpecQueryModelGroup ?
        item.getTopSpecQueryModel():
        item;
      return {
        enumSpecIndex: specM.enumSpecIndex,
        fieldSet: specM.specQuery.encodings,
        vlSpec: specM.toSpec(),
        shorthand: specM.toShorthand()
      };
    }

    function transpose(spec) {
      var encoding = _.clone(spec.encoding);
      var oldXEnc = encoding.x;
      var oldYEnc = encoding.y;
      encoding.y = oldXEnc;
      encoding.x = oldYEnc;

      var oldRowEnc = encoding.row;
      var oldColEnc = encoding.column;
      encoding.row = oldColEnc;
      encoding.column = oldRowEnc;

      spec.encoding = encoding;
    }

    return Chart;
  }]);
}());

;(function() {
'use strict';

// Service for the spec config.
// We keep this separate so that changes are kept even if the spec changes.
angular.module('vlui')
  .factory('Config', function() {
    var Config = {};

    Config.data = {};
    Config.config = {};

    Config.getConfig = function() {
      return {};
    };

    Config.getData = function() {
      return Config.data;
    };

    Config.large = function() {
      return {
        cell: {
          width: 400,
          height: 400
        },
        facet: {
          cell: {
            width: 200,
            height: 200
          }
        }
      };
    };

    Config.small = function() {
      return {
        facet: {
          cell: {
            width: 150,
            height: 150
          }
        }
      };
    };

    Config.updateDataset = function(dataset, type) {
      if (dataset.values) {
        Config.data.values = dataset.values;
        delete Config.data.url;
        Config.data.formatType = undefined;
      } else {
        Config.data.url = dataset.url;
        delete Config.data.values;
        Config.data.formatType = type;
      }
    };

    return Config;
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vega-lite-ui.logger
 * @description
 * # logger
 * Service in the vega-lite-ui.
 */
angular.module('vlui')
  .service('Logger', ['$location', '$window', '$webSql', '_', 'consts', 'Analytics', 'Papa', 'Blob', 'URL', function ($location, $window, $webSql, _, consts, Analytics, Papa, Blob, URL) {

    var service = {};

    service.levels = {
      OFF: {id:'OFF', rank:0},
      TRACE: {id:'TRACE', rank:1},
      DEBUG: {id:'DEBUG', rank:2},
      INFO: {id:'INFO', rank:3},
      WARN: {id:'WARN', rank:4},
      ERROR: {id:'ERROR', rank:5},
      FATAL: {id:'FATAL', rank:6}
    };

    service.actions = {
      // DATA
      INITIALIZE: {category: 'DATA', id: 'INITIALIZE', level: service.levels.DEBUG},
      UNDO: {category: 'DATA', id: 'UNDO', level: service.levels.INFO},
      REDO: {category: 'DATA', id: 'REDO', level: service.levels.INFO},
      DATASET_CHANGE: {category: 'DATA', id: 'DATASET_CHANGE', level: service.levels.INFO},
      DATASET_OPEN: {category: 'DATA', id: 'DATASET_OPEN', level: service.levels.INFO},
      DATASET_NEW_PASTE: {category: 'DATA', id: 'DATASET_NEW_PASTE', level: service.levels.INFO},
      DATASET_NEW_URL: {category: 'DATA', id: 'DATASET_NEW_URL', level: service.levels.INFO},
      // BOOKMARK
      BOOKMARK_ADD: {category: 'BOOKMARK', id:'BOOKMARK_ADD', level: service.levels.INFO},
      BOOKMARK_REMOVE: {category: 'BOOKMARK', id:'BOOKMARK_REMOVE', level: service.levels.INFO},
      BOOKMARK_OPEN: {category: 'BOOKMARK', id:'BOOKMARK_OPEN', level: service.levels.INFO},
      BOOKMARK_CLOSE: {category: 'BOOKMARK', id:'BOOKMARK_CLOSE', level: service.levels.INFO},
      BOOKMARK_CLEAR: {category: 'BOOKMARK', id: 'BOOKMARK_CLEAR', level: service.levels.INFO},
      // CHART
      CHART_MOUSEOVER: {category: 'CHART', id:'CHART_MOUSEOVER', level: service.levels.DEBUG},
      CHART_MOUSEOUT: {category: 'CHART', id:'CHART_MOUSEOUT', level: service.levels.DEBUG},
      CHART_RENDER: {category: 'CHART', id:'CHART_RENDER', level: service.levels.DEBUG},
      CHART_EXPOSE: {category: 'CHART', id:'CHART_EXPOSE', level: service.levels.DEBUG},
      CHART_TOOLTIP: {category: 'CHART', id:'CHART_TOOLTIP', level: service.levels.DEBUG},
      CHART_TOOLTIP_END: {category: 'CHART', id:'CHART_TOOLTIP_END', level: service.levels.DEBUG},

      SORT_TOGGLE: {category: 'CHART', id:'SORT_TOGGLE', level: service.levels.INFO},
      MARK_TOGGLE: {category: 'CHART', id:'MARK_TOGGLE', level: service.levels.INFO},
      DRILL_DOWN_OPEN: {category: 'CHART', id:'DRILL_DOWN_OPEN', level: service.levels.INFO},
      DRILL_DOWN_CLOSE: {category: 'CHART', id: 'DRILL_DOWN_CLOSE', level: service.levels.INFO},
      LOG_TOGGLE: {category: 'CHART', id: 'LOG_TOGGLE', level: service.levels.INFO},
      TRANSPOSE_TOGGLE: {category: 'CHART', id: 'TRANSPOSE_TOGGLE', level: service.levels.INFO},
      NULL_FILTER_TOGGLE: {category: 'CHART', id:'NULL_FILTER_TOGGLE', level: service.levels.INFO},

      CLUSTER_SELECT: {category: 'CHART', id:'CLUSTER_SELECT', level: service.levels.INFO},
      LOAD_MORE: {category: 'CHART', id:'LOAD_MORE', level: service.levels.INFO},

      // FIELDS
      FIELDS_CHANGE: {category: 'FIELDS', id: 'FIELDS_CHANGE', level: service.levels.INFO},
      FIELDS_RESET: {category: 'FIELDS', id: 'FIELDS_RESET', level: service.levels.INFO},
      FUNC_CHANGE: {category: 'FIELDS', id: 'FUNC_CHANGE', level: service.levels.INFO},
      ADD_FIELD: {category: 'FIELDS', id: 'ADD_FIELD', level: service.levels.INFO},

      // Field Info
      FIELDDEF_HIGHLIGHTED: {category: 'FIELDINFO', id: 'FIELDDEF_HIGHLIGHTED', level: service.levels.INFO},
      FIELDDEF_UNHIGHLIGHTED: {category: 'FIELDINFO', id: 'FIELDDEF_UNHIGHLIGHTED', level: service.levels.INFO},

      //POLESTAR
      SPEC_CLEAN: {category:'POLESTAR', id: 'SPEC_CLEAN', level: service.levels.INFO},
      SPEC_CHANGE: {category:'POLESTAR', id: 'SPEC_CHANGE', level: service.levels.INFO},
      FIELD_DROP: {category: 'POLESTAR', id: 'FIELD_DROP', level: service.levels.INFO},
      MARK_CHANGE: {category: 'POLESTAR', id: 'MARK_CHANGE', level: service.levels.INFO},

      // Voyager 2
      SPEC_SELECT: {category:'VOYAGER2', id: 'SPEC_SELECT', level: service.levels.INFO},

      // Alternatives
      SET_ALTERNATIVES_TYPE: {category:'ALTERNATIVES', id: 'SET_ALTERNATIVES_TYPE', level: service.levels.INFO},
      TOGGLE_SHOW_ALTERNATIVES: {category:'ALTERNATIVES', id: 'TOGGLE_SHOW_ALTERNATIVES', level: service.levels.INFO},
      TOGGLE_HIDE_ALTERNATIVES: {category:'ALTERNATIVES', id: 'TOGGLE_HIDE_ALTERNATIVES', level: service.levels.INFO},

      // Preview
      SPEC_PREVIEW_ENABLED: {category:'PREVIEW', id: 'SPEC_PREVIEW_ENABLED', level: service.levels.INFO},
      SPEC_PREVIEW_DISABLED: {category:'PREVIEW', id: 'SPEC_PREVIEW_DISABLED', level: service.levels.INFO}
    };

    // create noop service if websql is not supported
    if ($window.openDatabase === undefined) {
      console.warn('No websql support and thus no logging.');
      service.logInteraction = function() {};
      return service;
    }

    // get user id once in the beginning
    var userid = service.userid = $location.search().userid;

    service.db = $webSql.openDatabase('logs', '1.0', 'Logs', 2 * 1024 * 1024);

    service.tableName = 'Logs_' + consts.appId;

    // (zening) TODO: check if the table is correct, do we really need time? will time be automatically added?
    service.createTableIfNotExists = function() {
      service.db.createTable(service.tableName, {
        'userid': {
          'type': 'INTEGER',
          'null': 'NOT NULL'
        },
        'time': {
          'type': 'TIMESTAMP',
          'null': 'NOT NULL'
        },
        'actionCategory': {
          'type': 'TEXT',
          'null': 'NOT NULL'
        },
        'actionId': {
          'type': 'TEXT',
          'null': 'NOT NULL'
        },
        'label': {
          'type': 'TEXT',
          'null': 'NOT NULL'
        },
        'data': {
          'type': 'TEXT'
        }
      });
    };

    service.clear = function() {
      var r = $window.confirm('Really clear the logs?');
      if (r === true) {
        service.db.dropTable(service.tableName);
        service.createTableIfNotExists();
      }
    };

    service.export = function() {
      service.db.selectAll(service.tableName).then(function(results) {
        if (results.rows.length === 0) {
          console.warn('No logs');
          return;
        }

        var rows = [];

        for(var i=0; i < results.rows.length; i++) {
          rows.push(results.rows.item(i));
        }

        var csv = Papa.unparse(rows);

        var csvData = new Blob([csv], { type: 'text/csv' });
        var csvUrl = URL.createObjectURL(csvData);

        var element = angular.element('<a/>');
        element.attr({
          href: csvUrl,
          target: '_blank',
          download: service.tableName + '_' + userid + '_' + new Date().toISOString() + '.csv'
        })[0].click();
      });
    };


    service.logInteraction = function(action, label, data) {
      if (!consts.logging) {
        return;
      }
      var value = data ? data.value : undefined;
      if(action.level.rank >= service.levels[consts.logLevel || 'INFO'].rank) {
        Analytics.trackEvent(action.category, action.id, label, value);

        if (consts.logToWebSql) {
          var row = {
            userid: userid,
            time: new Date().toISOString(),
            actionCategory: action.category,
            actionId: action.id,
            label: _.isObject(label) ? JSON.stringify(label) : label,
            data: data ? JSON.stringify(data) : undefined
          };
          service.db.insert(service.tableName, row);
        }

        if (action.level.rank >= service.levels[consts.logPrintLevel || 'INFO'].rank) {
          console.log('[Logging] ', action.id, label, data);
        }
      }
    };

    service.createTableIfNotExists();
    console.log('app:', consts.appId, 'started');
    service.logInteraction(service.actions.INITIALIZE, consts.appId);

    return service;
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Pills', ['ANY', 'util', function (ANY, util) {
    var Pills = {
      // Functions
      isAnyChannel: isAnyChannel,
      getNextAnyChannelId: getNextAnyChannelId,
      getEmptyAnyChannelId: getEmptyAnyChannelId,
      isEnumeratedChannel: isEnumeratedChannel,
      isEnumeratedField: isEnumeratedField,

      get: get,
      // Event
      dragStart: dragStart,
      dragStop: dragStop,
      // Event, with handler in the listener

      /** Set a fieldDef for a channel */
      set: set,

      /** Remove a fieldDef from a channel */
      remove: remove,

      /** Add new field to the pills */
      add: add,

      /** Pass message to toggler listeners */
      rescale: rescale,
      sort: sort,
      toggleFilterInvalid: toggleFilterInvalid,
      transpose: transpose,

      /** Parse a new spec */
      parse: parse,

      /** Preview a spec */
      preview: preview,

      /** If the spec/query gets updated */
      update: update,

      reset: reset,
      dragDrop: dragDrop,

      // Data
      // TODO: split between encoding related and non-encoding related
      pills: {},
      highlighted: {},
      /** pill being dragged */
      dragging: null,
      /** channelId that's the pill is being dragged from */
      cidDragFrom: null,
      /** Listener  */
      listener: null
    };

    /**
     * Returns whether the given channel id is an "any" channel
     *
     * @param {any} channelId
     */
    function isAnyChannel(channelId) {
      return channelId && channelId.indexOf(ANY) === 0; // prefix by ANY
    }

    function getEmptyAnyChannelId() {
      var anyChannels = util.keys(Pills.pills).filter(function(channelId) {
        return channelId.indexOf(ANY) === 0;
      });
      for (var i=0 ; i < anyChannels.length; i++) {
        var channelId = anyChannels[i];
        if (!Pills.pills[channelId].field) {
          return channelId;
        }
      }
      throw new Error('No empty any channel available!');
    }

    function getNextAnyChannelId() {
      var i = 0;
      while (Pills.pills[ANY + i]) {
        i++;
      }
      return ANY + i;
    }

    /**
     * Set a fieldDef of a pill of a given channelId
     * @param channelId channel id of the pill to be updated
     * @param fieldDef fieldDef to to be updated
     * @param update whether to propagate change to the channel update listener
     */
    function set(channelId, fieldDef, update) {
      Pills.pills[channelId] = fieldDef;

      if (update && Pills.listener) {
        Pills.listener.set(channelId, fieldDef);
      }
    }

    /**
     * Get a fieldDef of a pill of a given channelId
     */
    function get(channelId) {
      return Pills.pills[channelId];
    }

    function add(fieldDef) {
      if (Pills.listener && Pills.listener.add) {
        Pills.listener.add(fieldDef);
      }
    }

    function isEnumeratedChannel(channelId) {
      if (Pills.listener && Pills.listener.isEnumeratedChannel) {
        return Pills.listener.isEnumeratedChannel(channelId, Pills.pills[channelId]);
      }
      return false;
    }

    function isEnumeratedField(channelId) {
      if (Pills.listener && Pills.listener.isEnumeratedField) {
        return Pills.listener.isEnumeratedField(channelId, Pills.pills[channelId]);
      }
      return false;
    }

    function remove(channelId) {
      delete Pills.pills[channelId];
      if (Pills.listener) {
        Pills.listener.remove(channelId);
      }
    }

    function sort(channelId, sort) {
      if (Pills.listener && Pills.listener.sort) {
        Pills.listener.sort(channelId, sort);
      }
    }

    function rescale(channelId, scaleType) {
      if (Pills.listener && Pills.listener.rescale) {
        Pills.listener.rescale(channelId, scaleType);
      }
    }

    function toggleFilterInvalid() {
      if (Pills.listener && Pills.listener.toggleFilterInvalid) {
        Pills.listener.toggleFilterInvalid();
      }
    }

    function transpose() {
      if (Pills.listener && Pills.listener.transpose) {
        Pills.listener.transpose();
      }
    }

    /**
     * Re-parse the spec.
     *
     * @param {any} spec
     */
    function parse(spec) {
      if (Pills.listener) {
        Pills.listener.parse(spec);
      }
    }

    /**
     * Add Spec to be previewed (for Voyager2)
     *
     * @param {any} spec
     */
    function preview(spec) {
      if (Pills.listener) {
        Pills.listener.preview(spec);
      }
    }

    /**
     * Update the whole pill set
     *
     * @param {any} spec
     */
    function update(spec) {
      if (Pills.listener) {
        Pills.listener.update(spec);
      }
    }


    /** Reset Pills */
    function reset() {
      if (Pills.listener) {
        Pills.listener.reset();
      }
    }

    /**
     * @param {any} pill pill being dragged
     * @param {any} cidDragFrom channel id that the pill is dragged from
     */
    function dragStart(pill, cidDragFrom) {
      Pills.dragging = pill;
      Pills.cidDragFrom = cidDragFrom;
    }

    /** Stop pill dragging */
    function dragStop() {
      Pills.dragging = null;
    }

    /**
     * When a pill is dropped
     * @param cidDragTo  channelId that's the pill is being dragged to
     */
    function dragDrop(cidDragTo) {
      if (Pills.listener) {
        Pills.listener.dragDrop(cidDragTo, Pills.cidDragFrom);
      }
    }

    return Pills;
  }]);
}());

;(function() {
'use strict';

// Service for serving VL Schema
angular.module('vlui')
  .factory('Schema', ['vg', 'vl', 'vlSchema', function(vg, vl, vlSchema) {
    var Schema = {};

    Schema.schema = vlSchema;

    Schema.getChannelSchema = function(channel) {
      var def = null;
      var encodingChannelProp = Schema.schema.definitions.Encoding.properties[channel];
      // for detail, just get the flat version
      var ref = encodingChannelProp ?
        (encodingChannelProp.$ref || encodingChannelProp.oneOf[0].$ref) :
        'FieldDef'; // just use the generic version for ANY channel
      def = ref.slice(ref.lastIndexOf('/')+1);
      return Schema.schema.definitions[def];
    };

    return Schema;
  }]);
}());

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb24zLWNvbXBhY3RzdHJpbmdpZnkuanMiLCJ2bC1zY2hlbWEuanMiLCJpbmRleC5qcyIsInRlbXBsYXRlQ2FjaGVIdG1sLmpzIiwiZGF0YXNldC9hZGRteXJpYWRhdGFzZXQuanMiLCJkYXRhc2V0L2FkZHVybGRhdGFzZXQuanMiLCJkYXRhc2V0L2NoYW5nZWxvYWRlZGRhdGFzZXQuanMiLCJkYXRhc2V0L2RhdGFzZXQuc2VydmljZS5qcyIsImRhdGFzZXQvZGF0YXNldG1vZGFsLmpzIiwiZGF0YXNldC9kYXRhc2V0c2VsZWN0b3IuanMiLCJkYXRhc2V0L2ZpbGVkcm9wem9uZS5qcyIsImRhdGFzZXQvcGFzdGVkYXRhc2V0LmpzIiwiZGF0YXNldC9zYW1wbGVkYXRhLmpzIiwiY29tcG9uZW50cy9hbGVydG1lc3NhZ2VzL2FsZXJ0bWVzc2FnZXMuanMiLCJjb21wb25lbnRzL2Jvb2ttYXJrbGlzdC9ib29rbWFya2xpc3QuanMiLCJjb21wb25lbnRzL2NoYW5uZWxzaGVsZi9jaGFubmVsc2hlbGYuanMiLCJjb21wb25lbnRzL2ZpZWxkaW5mby9maWVsZGluZm8uanMiLCJjb21wb25lbnRzL2Z1bmN0aW9uc2VsZWN0L2Z1bmN0aW9uc2VsZWN0LmpzIiwiY29tcG9uZW50cy9tb2RhbC9tb2RhbC5qcyIsImNvbXBvbmVudHMvbW9kYWwvbW9kYWxjbG9zZWJ1dHRvbi5qcyIsImNvbXBvbmVudHMvbW9kYWwvbW9kYWxzLnNlcnZpY2UuanMiLCJjb21wb25lbnRzL3Byb3BlcnR5ZWRpdG9yL3Byb3BlcnR5ZWRpdG9yLmpzIiwiY29tcG9uZW50cy9zY2hlbWFsaXN0L3NjaGVtYWxpc3QuanMiLCJjb21wb25lbnRzL3NjaGVtYWxpc3Qvc2NoZW1hbGlzdGl0ZW0uanMiLCJjb21wb25lbnRzL3NoZWx2ZXMvc2hlbHZlcy5qcyIsImNvbXBvbmVudHMvdGFicy90YWIuanMiLCJjb21wb25lbnRzL3RhYnMvdGFic2V0LmpzIiwiY29tcG9uZW50cy92bHBsb3QvdmxwbG90LmpzIiwiY29tcG9uZW50cy92bHBsb3Rncm91cC92bHBsb3Rncm91cC5qcyIsImNvbXBvbmVudHMvdmxwbG90Z3JvdXAvdmxwbG90Z3JvdXBwb3B1cC5qcyIsImNvbXBvbmVudHMvdmxwbG90Z3JvdXBsaXN0L3ZscGxvdGdyb3VwbGlzdC5qcyIsImZpbHRlcnMvY29tcGFjdGpzb24vY29tcGFjdGpzb24uZmlsdGVyLmpzIiwiZmlsdGVycy9lbmNvZGV1cmkvZW5jb2RldXJpLmZpbHRlci5qcyIsImZpbHRlcnMvcmVwb3J0dXJsL3JlcG9ydHVybC5maWx0ZXIuanMiLCJmaWx0ZXJzL3VuZGVyc2NvcmUyc3BhY2UvdW5kZXJzY29yZTJzcGFjZS5maWx0ZXIuanMiLCJzZXJ2aWNlcy9hbGVydHMvYWxlcnRzLnNlcnZpY2UuanMiLCJzZXJ2aWNlcy9ib29rbWFya3MvYm9va21hcmtzLnNlcnZpY2UuanMiLCJzZXJ2aWNlcy9jaGFydC9jaGFydC5zZXJ2aWNlLmpzIiwic2VydmljZXMvY29uZmlnL2NvbmZpZy5zZXJ2aWNlLmpzIiwic2VydmljZXMvbG9nZ2VyL2xvZ2dlci5zZXJ2aWNlLmpzIiwic2VydmljZXMvcGlsbHMvcGlsbHMuc2VydmljZS5qcyIsInNlcnZpY2VzL3NjaGVtYS9zY2hlbWEuc2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7QUFLQSxDQUFDLENBQUMsWUFBWTs7O0VBR1osSUFBSSxXQUFXLE9BQU8sV0FBVyxjQUFjLE9BQU87OztFQUd0RCxJQUFJLGNBQWM7SUFDaEIsWUFBWTtJQUNaLFVBQVU7Ozs7RUFJWixJQUFJLGNBQWMsWUFBWSxPQUFPLFlBQVksV0FBVyxDQUFDLFFBQVEsWUFBWTs7Ozs7O0VBTWpGLElBQUksT0FBTyxZQUFZLE9BQU8sV0FBVyxVQUFVO01BQy9DLGFBQWEsZUFBZSxZQUFZLE9BQU8sV0FBVyxVQUFVLENBQUMsT0FBTyxZQUFZLE9BQU8sVUFBVSxZQUFZOztFQUV6SCxJQUFJLGVBQWUsV0FBVyxjQUFjLGNBQWMsV0FBVyxjQUFjLGNBQWMsV0FBVyxZQUFZLGFBQWE7SUFDbkksT0FBTzs7Ozs7RUFLVCxTQUFTLGFBQWEsU0FBUyxTQUFTO0lBQ3RDLFlBQVksVUFBVSxLQUFLO0lBQzNCLFlBQVksVUFBVSxLQUFLOzs7SUFHM0IsSUFBSSxTQUFTLFFBQVEsYUFBYSxLQUFLO1FBQ25DLFNBQVMsUUFBUSxhQUFhLEtBQUs7UUFDbkMsU0FBUyxRQUFRLGFBQWEsS0FBSztRQUNuQyxPQUFPLFFBQVEsV0FBVyxLQUFLO1FBQy9CLGNBQWMsUUFBUSxrQkFBa0IsS0FBSztRQUM3QyxZQUFZLFFBQVEsZ0JBQWdCLEtBQUs7UUFDekMsT0FBTyxRQUFRLFdBQVcsS0FBSztRQUMvQixhQUFhLFFBQVEsV0FBVyxLQUFLOzs7SUFHekMsSUFBSSxPQUFPLGNBQWMsWUFBWSxZQUFZO01BQy9DLFFBQVEsWUFBWSxXQUFXO01BQy9CLFFBQVEsUUFBUSxXQUFXOzs7O0lBSTdCLElBQUksY0FBYyxPQUFPO1FBQ3JCLFdBQVcsWUFBWTtRQUN2QixZQUFZLFNBQVM7OztJQUd6QixJQUFJLGFBQWEsSUFBSSxLQUFLLENBQUM7SUFDM0IsSUFBSTs7O01BR0YsYUFBYSxXQUFXLG9CQUFvQixDQUFDLFVBQVUsV0FBVyxrQkFBa0IsS0FBSyxXQUFXLGlCQUFpQjs7OztRQUluSCxXQUFXLGlCQUFpQixNQUFNLFdBQVcsbUJBQW1CLE1BQU0sV0FBVyxtQkFBbUIsS0FBSyxXQUFXLHdCQUF3QjtNQUM5SSxPQUFPLFdBQVc7Ozs7SUFJcEIsU0FBUyxJQUFJLE1BQU07TUFDakIsSUFBSSxJQUFJLFVBQVUsT0FBTzs7UUFFdkIsT0FBTyxJQUFJOztNQUViLElBQUk7TUFDSixJQUFJLFFBQVEseUJBQXlCOzs7UUFHbkMsY0FBYyxJQUFJLE1BQU07YUFDbkIsSUFBSSxRQUFRLFFBQVE7OztRQUd6QixjQUFjLElBQUkscUJBQXFCLElBQUk7YUFDdEM7UUFDTCxJQUFJLE9BQU8sYUFBYTs7UUFFeEIsSUFBSSxRQUFRLGtCQUFrQjtVQUM1QixJQUFJLFlBQVksUUFBUSxXQUFXLHFCQUFxQixPQUFPLGFBQWEsY0FBYztVQUMxRixJQUFJLG9CQUFvQjs7WUFFdEIsQ0FBQyxRQUFRLFlBQVk7Y0FDbkIsT0FBTztlQUNOLFNBQVM7WUFDWixJQUFJO2NBQ0Y7OztnQkFHRSxVQUFVLE9BQU87OztnQkFHakIsVUFBVSxJQUFJLGNBQWM7Z0JBQzVCLFVBQVUsSUFBSSxhQUFhOzs7OztnQkFLM0IsVUFBVSxjQUFjOzs7Z0JBR3hCLFVBQVUsV0FBVzs7O2dCQUdyQixnQkFBZ0I7Ozs7OztnQkFNaEIsVUFBVSxXQUFXO2dCQUNyQixVQUFVLENBQUMsV0FBVzs7O2dCQUd0QixVQUFVLENBQUMsV0FBVzs7Z0JBRXRCLFVBQVUsU0FBUzs7Ozs7Z0JBS25CLFVBQVUsQ0FBQyxPQUFPLFVBQVUsVUFBVTs7O2dCQUd0QyxVQUFVLEVBQUUsS0FBSyxDQUFDLE9BQU8sTUFBTSxPQUFPLE1BQU0sd0JBQXdCOztnQkFFcEUsVUFBVSxNQUFNLFdBQVc7Z0JBQzNCLFVBQVUsQ0FBQyxHQUFHLElBQUksTUFBTSxNQUFNOzs7Z0JBRzlCLFVBQVUsSUFBSSxLQUFLLENBQUMsYUFBYTs7Z0JBRWpDLFVBQVUsSUFBSSxLQUFLLGFBQWE7OztnQkFHaEMsVUFBVSxJQUFJLEtBQUssQ0FBQyxpQkFBaUI7OztnQkFHckMsVUFBVSxJQUFJLEtBQUssQ0FBQyxPQUFPO2NBQzdCLE9BQU8sV0FBVztjQUNsQixxQkFBcUI7OztVQUd6QixjQUFjOzs7UUFHaEIsSUFBSSxRQUFRLGNBQWM7VUFDeEIsSUFBSSxRQUFRLFFBQVE7VUFDcEIsSUFBSSxPQUFPLFNBQVMsWUFBWTtZQUM5QixJQUFJOzs7O2NBSUYsSUFBSSxNQUFNLFNBQVMsS0FBSyxDQUFDLE1BQU0sUUFBUTs7Z0JBRXJDLFFBQVEsTUFBTTtnQkFDZCxJQUFJLGlCQUFpQixNQUFNLEtBQUssVUFBVSxLQUFLLE1BQU0sS0FBSyxPQUFPO2dCQUNqRSxJQUFJLGdCQUFnQjtrQkFDbEIsSUFBSTs7b0JBRUYsaUJBQWlCLENBQUMsTUFBTTtvQkFDeEIsT0FBTyxXQUFXO2tCQUNwQixJQUFJLGdCQUFnQjtvQkFDbEIsSUFBSTs7OztzQkFJRixpQkFBaUIsTUFBTSxVQUFVO3NCQUNqQyxPQUFPLFdBQVc7O2tCQUV0QixJQUFJLGdCQUFnQjtvQkFDbEIsSUFBSTs7OztzQkFJRixpQkFBaUIsTUFBTSxVQUFVO3NCQUNqQyxPQUFPLFdBQVc7Ozs7Y0FJMUIsT0FBTyxXQUFXO2NBQ2xCLGlCQUFpQjs7O1VBR3JCLGNBQWM7OztNQUdsQixPQUFPLElBQUksUUFBUSxDQUFDLENBQUM7OztJQUd2QixJQUFJLE1BQU07O01BRVIsSUFBSSxnQkFBZ0I7VUFDaEIsWUFBWTtVQUNaLGNBQWM7VUFDZCxjQUFjO1VBQ2QsYUFBYTtVQUNiLGVBQWU7OztNQUduQixJQUFJLGlCQUFpQixJQUFJOzs7TUFHekIsSUFBSSxDQUFDLFlBQVk7UUFDZixJQUFJLFFBQVEsS0FBSzs7O1FBR2pCLElBQUksU0FBUyxDQUFDLEdBQUcsSUFBSSxJQUFJLElBQUksS0FBSyxLQUFLLEtBQUssS0FBSyxLQUFLLEtBQUssS0FBSzs7O1FBR2hFLElBQUksU0FBUyxVQUFVLE1BQU0sT0FBTztVQUNsQyxPQUFPLE9BQU8sU0FBUyxPQUFPLE9BQU8sUUFBUSxNQUFNLENBQUMsT0FBTyxRQUFRLFFBQVEsRUFBRSxRQUFRLE9BQU8sS0FBSyxNQUFNLENBQUMsT0FBTyxPQUFPLFNBQVMsT0FBTyxNQUFNLENBQUMsT0FBTyxPQUFPLFNBQVM7Ozs7OztNQU14SyxJQUFJLEVBQUUsYUFBYSxZQUFZLGlCQUFpQjtRQUM5QyxhQUFhLFVBQVUsVUFBVTtVQUMvQixJQUFJLFVBQVUsSUFBSTtVQUNsQixJQUFJLENBQUMsUUFBUSxZQUFZLE1BQU0sUUFBUSxZQUFZOzs7WUFHakQsWUFBWTthQUNYLFNBQVMsWUFBWSxVQUFVOzs7WUFHaEMsYUFBYSxVQUFVLFVBQVU7Ozs7Y0FJL0IsSUFBSSxXQUFXLEtBQUssV0FBVyxTQUFTLGFBQWEsS0FBSyxZQUFZLE1BQU07O2NBRTVFLEtBQUssWUFBWTtjQUNqQixPQUFPOztpQkFFSjs7WUFFTCxjQUFjLFFBQVE7OztZQUd0QixhQUFhLFVBQVUsVUFBVTtjQUMvQixJQUFJLFNBQVMsQ0FBQyxLQUFLLGVBQWUsYUFBYTtjQUMvQyxPQUFPLFlBQVksUUFBUSxFQUFFLFlBQVksVUFBVSxLQUFLLGNBQWMsT0FBTzs7O1VBR2pGLFVBQVU7VUFDVixPQUFPLFdBQVcsS0FBSyxNQUFNOzs7Ozs7TUFNakMsVUFBVSxVQUFVLFFBQVEsVUFBVTtRQUNwQyxJQUFJLE9BQU8sR0FBRyxZQUFZLFNBQVM7Ozs7O1FBS25DLENBQUMsYUFBYSxZQUFZO1VBQ3hCLEtBQUssVUFBVTtXQUNkLFVBQVUsVUFBVTs7O1FBR3ZCLFVBQVUsSUFBSTtRQUNkLEtBQUssWUFBWSxTQUFTOztVQUV4QixJQUFJLFdBQVcsS0FBSyxTQUFTLFdBQVc7WUFDdEM7OztRQUdKLGFBQWEsVUFBVTs7O1FBR3ZCLElBQUksQ0FBQyxNQUFNOztVQUVULFVBQVUsQ0FBQyxXQUFXLFlBQVksa0JBQWtCLHdCQUF3QixpQkFBaUIsa0JBQWtCOzs7VUFHL0csVUFBVSxVQUFVLFFBQVEsVUFBVTtZQUNwQyxJQUFJLGFBQWEsU0FBUyxLQUFLLFdBQVcsZUFBZSxVQUFVO1lBQ25FLElBQUksY0FBYyxDQUFDLGNBQWMsT0FBTyxPQUFPLGVBQWUsY0FBYyxZQUFZLE9BQU8sT0FBTyxtQkFBbUIsT0FBTyxrQkFBa0I7WUFDbEosS0FBSyxZQUFZLFFBQVE7OztjQUd2QixJQUFJLEVBQUUsY0FBYyxZQUFZLGdCQUFnQixZQUFZLEtBQUssUUFBUSxXQUFXO2dCQUNsRixTQUFTOzs7O1lBSWIsS0FBSyxTQUFTLFFBQVEsUUFBUSxXQUFXLFFBQVEsRUFBRSxTQUFTLFlBQVksS0FBSyxRQUFRLGFBQWEsU0FBUyxVQUFVOztlQUVsSCxJQUFJLFFBQVEsR0FBRzs7VUFFcEIsVUFBVSxVQUFVLFFBQVEsVUFBVTs7WUFFcEMsSUFBSSxVQUFVLElBQUksYUFBYSxTQUFTLEtBQUssV0FBVyxlQUFlO1lBQ3ZFLEtBQUssWUFBWSxRQUFROzs7O2NBSXZCLElBQUksRUFBRSxjQUFjLFlBQVksZ0JBQWdCLENBQUMsV0FBVyxLQUFLLFNBQVMsY0FBYyxRQUFRLFlBQVksTUFBTSxXQUFXLEtBQUssUUFBUSxXQUFXO2dCQUNuSixTQUFTOzs7O2VBSVY7O1VBRUwsVUFBVSxVQUFVLFFBQVEsVUFBVTtZQUNwQyxJQUFJLGFBQWEsU0FBUyxLQUFLLFdBQVcsZUFBZSxVQUFVO1lBQ25FLEtBQUssWUFBWSxRQUFRO2NBQ3ZCLElBQUksRUFBRSxjQUFjLFlBQVksZ0JBQWdCLFdBQVcsS0FBSyxRQUFRLGFBQWEsRUFBRSxnQkFBZ0IsYUFBYSxnQkFBZ0I7Z0JBQ2xJLFNBQVM7Ozs7O1lBS2IsSUFBSSxpQkFBaUIsV0FBVyxLQUFLLFNBQVMsV0FBVyxpQkFBaUI7Y0FDeEUsU0FBUzs7OztRQUlmLE9BQU8sUUFBUSxRQUFROzs7Ozs7Ozs7TUFTekIsSUFBSSxNQUFNOztRQUVSLElBQUksVUFBVTtVQUNaLElBQUk7VUFDSixJQUFJO1VBQ0osR0FBRztVQUNILElBQUk7VUFDSixJQUFJO1VBQ0osSUFBSTtVQUNKLEdBQUc7Ozs7O1FBS0wsSUFBSSxnQkFBZ0I7UUFDcEIsSUFBSSxpQkFBaUIsVUFBVSxPQUFPLE9BQU87OztVQUczQyxPQUFPLENBQUMsaUJBQWlCLFNBQVMsSUFBSSxNQUFNLENBQUM7Ozs7Ozs7UUFPL0MsSUFBSSxnQkFBZ0I7UUFDcEIsSUFBSSxRQUFRLFVBQVUsT0FBTztVQUMzQixJQUFJLFNBQVMsS0FBSyxRQUFRLEdBQUcsU0FBUyxNQUFNLFFBQVEsZUFBZSxDQUFDLGtCQUFrQixTQUFTO1VBQy9GLElBQUksVUFBVSxpQkFBaUIsaUJBQWlCLE1BQU0sTUFBTSxNQUFNO1VBQ2xFLE9BQU8sUUFBUSxRQUFRLFNBQVM7WUFDOUIsSUFBSSxXQUFXLE1BQU0sV0FBVzs7O1lBR2hDLFFBQVE7Y0FDTixLQUFLLEdBQUcsS0FBSyxHQUFHLEtBQUssSUFBSSxLQUFLLElBQUksS0FBSyxJQUFJLEtBQUssSUFBSSxLQUFLO2dCQUN2RCxVQUFVLFFBQVE7Z0JBQ2xCO2NBQ0Y7Z0JBQ0UsSUFBSSxXQUFXLElBQUk7a0JBQ2pCLFVBQVUsZ0JBQWdCLGVBQWUsR0FBRyxTQUFTLFNBQVM7a0JBQzlEOztnQkFFRixVQUFVLGVBQWUsUUFBUSxTQUFTLE1BQU0sT0FBTzs7O1VBRzdELE9BQU8sU0FBUzs7Ozs7UUFLbEIsSUFBSSxZQUFZLFVBQVUsVUFBVSxRQUFRLFVBQVUsWUFBWSxZQUFZLGFBQWEsT0FBTyxlQUFlO1VBQy9HLElBQUksT0FBTyxXQUFXLE1BQU0sT0FBTyxNQUFNLE1BQU0sT0FBTyxTQUFTLFNBQVMsY0FBYyxTQUFTLFNBQVMsT0FBTyxRQUFRLFFBQVE7O1VBRS9ILGdCQUFnQixpQkFBaUI7O1VBRWpDLElBQUk7O1lBRUYsUUFBUSxPQUFPO1lBQ2YsT0FBTyxXQUFXO1VBQ3BCLElBQUksT0FBTyxTQUFTLFlBQVksT0FBTztZQUNyQyxZQUFZLFNBQVMsS0FBSztZQUMxQixJQUFJLGFBQWEsYUFBYSxDQUFDLFdBQVcsS0FBSyxPQUFPLFdBQVc7Y0FDL0QsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxHQUFHOzs7O2dCQUluQyxJQUFJLFFBQVE7Ozs7a0JBSVYsT0FBTyxNQUFNLFFBQVE7a0JBQ3JCLEtBQUssT0FBTyxNQUFNLE9BQU8sWUFBWSxPQUFPLEdBQUcsT0FBTyxPQUFPLEdBQUcsTUFBTSxNQUFNLE9BQU87a0JBQ25GLEtBQUssUUFBUSxNQUFNLENBQUMsT0FBTyxPQUFPLE1BQU0sTUFBTSxRQUFRLE9BQU8sTUFBTSxRQUFRLE1BQU0sTUFBTSxRQUFRO2tCQUMvRixPQUFPLElBQUksT0FBTyxPQUFPLE1BQU07Ozs7O2tCQUsvQixPQUFPLENBQUMsUUFBUSxRQUFRLFNBQVM7OztrQkFHakMsUUFBUSxNQUFNLE9BQU8sUUFBUTtrQkFDN0IsVUFBVSxNQUFNLE9BQU8sT0FBTztrQkFDOUIsVUFBVSxNQUFNLE9BQU8sT0FBTztrQkFDOUIsZUFBZSxPQUFPO3VCQUNqQjtrQkFDTCxPQUFPLE1BQU07a0JBQ2IsUUFBUSxNQUFNO2tCQUNkLE9BQU8sTUFBTTtrQkFDYixRQUFRLE1BQU07a0JBQ2QsVUFBVSxNQUFNO2tCQUNoQixVQUFVLE1BQU07a0JBQ2hCLGVBQWUsTUFBTTs7O2dCQUd2QixRQUFRLENBQUMsUUFBUSxLQUFLLFFBQVEsTUFBTSxDQUFDLE9BQU8sSUFBSSxNQUFNLE9BQU8sZUFBZSxHQUFHLE9BQU8sSUFBSSxDQUFDLE9BQU8sUUFBUSxlQUFlLEdBQUc7a0JBQzFILE1BQU0sZUFBZSxHQUFHLFFBQVEsS0FBSyxNQUFNLGVBQWUsR0FBRzs7O2tCQUc3RCxNQUFNLGVBQWUsR0FBRyxTQUFTLE1BQU0sZUFBZSxHQUFHLFdBQVcsTUFBTSxlQUFlLEdBQUc7O2tCQUU1RixNQUFNLGVBQWUsR0FBRyxnQkFBZ0I7cUJBQ3JDO2dCQUNMLFFBQVE7O21CQUVMLElBQUksT0FBTyxNQUFNLFVBQVUsZUFBZSxDQUFDLGFBQWEsZUFBZSxhQUFhLGVBQWUsYUFBYSxlQUFlLFdBQVcsS0FBSyxPQUFPLFlBQVk7Ozs7O2NBS3ZLLFFBQVEsTUFBTSxPQUFPOzs7VUFHekIsSUFBSSxVQUFVOzs7WUFHWixRQUFRLFNBQVMsS0FBSyxRQUFRLFVBQVU7O1VBRTFDLElBQUksVUFBVSxNQUFNO1lBQ2xCLE9BQU87O1VBRVQsWUFBWSxTQUFTLEtBQUs7VUFDMUIsSUFBSSxhQUFhLGNBQWM7O1lBRTdCLE9BQU8sS0FBSztpQkFDUCxJQUFJLGFBQWEsYUFBYTs7O1lBR25DLE9BQU8sUUFBUSxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksSUFBSSxLQUFLLFFBQVE7aUJBQ2pELElBQUksYUFBYSxhQUFhOztZQUVuQyxPQUFPLE1BQU0sS0FBSzs7O1VBR3BCLElBQUksT0FBTyxTQUFTLFVBQVU7OztZQUc1QixLQUFLLFNBQVMsTUFBTSxRQUFRLFdBQVc7Y0FDckMsSUFBSSxNQUFNLFlBQVksT0FBTzs7Z0JBRTNCLE1BQU07Ozs7WUFJVixNQUFNLEtBQUs7WUFDWCxVQUFVOztZQUVWLFNBQVM7WUFDVCxlQUFlO1lBQ2YsSUFBSSxhQUFhLFlBQVk7Y0FDM0IsSUFBSSxjQUFjLFlBQVksUUFBUTs7Y0FFdEMsS0FBSyxRQUFRLEdBQUcsU0FBUyxNQUFNLFFBQVEsUUFBUSxRQUFRLFNBQVM7Z0JBQzlELFVBQVUsVUFBVSxPQUFPLE9BQU8sVUFBVSxZQUFZLFlBQVk7a0JBQ2xFLE9BQU87Z0JBQ1QsU0FBUyxZQUFZLFFBQVEsU0FBUztnQkFDdEMsZUFBZSxPQUFPLFVBQVUsUUFBUSxJQUFJLElBQUk7Z0JBQ2hELFFBQVEsS0FBSzs7Y0FFZixTQUFTLFFBQVE7O2tCQUViLGVBQWUsY0FBYztrQkFDN0IsUUFBUSxjQUFjLFFBQVEsS0FBSyxRQUFRLGVBQWUsT0FBTyxTQUFTO2tCQUMxRSxNQUFNLFFBQVEsS0FBSyxPQUFPOztrQkFFMUI7bUJBQ0M7Y0FDTCxJQUFJLGNBQWMsWUFBWSxRQUFRLE1BQU07Ozs7Y0FJNUMsUUFBUSxjQUFjLE9BQU8sVUFBVSxVQUFVO2dCQUMvQyxJQUFJLFFBQVEsVUFBVSxVQUFVLFVBQVUsT0FBTyxVQUFVLFlBQVksWUFBWTt3Q0FDM0QsT0FBTzs7Z0JBRS9CLElBQUksWUFBWSxPQUFPOzs7Ozs7O2tCQU9yQixTQUFTLE1BQU0sWUFBWSxPQUFPLGFBQWEsTUFBTSxNQUFNO2tCQUMzRCxlQUFlLE9BQU8sVUFBVSxVQUFVLElBQUksSUFBSTtrQkFDbEQsUUFBUSxLQUFLOzs7Y0FHakIsU0FBUyxRQUFROztrQkFFYixlQUFlLGNBQWM7a0JBQzdCLFFBQVEsY0FBYyxRQUFRLEtBQUssUUFBUSxlQUFlLE9BQU8sU0FBUztrQkFDMUUsTUFBTSxRQUFRLEtBQUssT0FBTzs7a0JBRTFCOzs7WUFHTixNQUFNO1lBQ04sT0FBTzs7Ozs7O1FBTVgsUUFBUSxZQUFZLFVBQVUsUUFBUSxRQUFRLE9BQU8sZUFBZTtVQUNsRSxJQUFJLFlBQVksVUFBVSxZQUFZO1VBQ3RDLElBQUksWUFBWSxPQUFPLFdBQVcsUUFBUTtZQUN4QyxJQUFJLENBQUMsWUFBWSxTQUFTLEtBQUssWUFBWSxlQUFlO2NBQ3hELFdBQVc7bUJBQ04sSUFBSSxhQUFhLFlBQVk7O2NBRWxDLGFBQWE7Y0FDYixLQUFLLElBQUksUUFBUSxHQUFHLFNBQVMsT0FBTyxRQUFRLE9BQU8sUUFBUSxRQUFRLFFBQVEsT0FBTyxVQUFVLENBQUMsQ0FBQyxZQUFZLFNBQVMsS0FBSyxTQUFTLGFBQWEsZUFBZSxhQUFhLGlCQUFpQixXQUFXLFNBQVMsR0FBRzs7O1VBR3ROLElBQUksT0FBTztZQUNULElBQUksQ0FBQyxZQUFZLFNBQVMsS0FBSyxXQUFXLGFBQWE7OztjQUdyRCxJQUFJLENBQUMsU0FBUyxRQUFRLEtBQUssR0FBRztnQkFDNUIsS0FBSyxhQUFhLElBQUksUUFBUSxPQUFPLFFBQVEsS0FBSyxXQUFXLFNBQVMsT0FBTyxjQUFjLElBQUk7O21CQUU1RixJQUFJLGFBQWEsYUFBYTtjQUNuQyxhQUFhLE1BQU0sVUFBVSxLQUFLLFFBQVEsTUFBTSxNQUFNLEdBQUc7Ozs7OztVQU03RCxPQUFPLFVBQVUsS0FBSyxRQUFRLElBQUksTUFBTSxNQUFNLFFBQVEsUUFBUSxVQUFVLFlBQVksWUFBWSxJQUFJLElBQUk7OztRQUcxRyxRQUFRLG1CQUFtQixVQUFVLFFBQVEsUUFBUSxNQUFNO1VBQ3pELE9BQU8sUUFBUSxVQUFVLFFBQVEsUUFBUSxPQUFPOzs7OztNQUtwRCxJQUFJLENBQUMsSUFBSSxlQUFlO1FBQ3RCLElBQUksZUFBZSxPQUFPOzs7O1FBSTFCLElBQUksWUFBWTtVQUNkLElBQUk7VUFDSixJQUFJO1VBQ0osSUFBSTtVQUNKLElBQUk7VUFDSixLQUFLO1VBQ0wsS0FBSztVQUNMLEtBQUs7VUFDTCxLQUFLOzs7O1FBSVAsSUFBSSxPQUFPOzs7UUFHWCxJQUFJLFFBQVEsWUFBWTtVQUN0QixRQUFRLFNBQVM7VUFDakIsTUFBTTs7Ozs7O1FBTVIsSUFBSSxNQUFNLFlBQVk7VUFDcEIsSUFBSSxTQUFTLFFBQVEsU0FBUyxPQUFPLFFBQVEsT0FBTyxPQUFPLFVBQVUsVUFBVTtVQUMvRSxPQUFPLFFBQVEsUUFBUTtZQUNyQixXQUFXLE9BQU8sV0FBVztZQUM3QixRQUFRO2NBQ04sS0FBSyxHQUFHLEtBQUssSUFBSSxLQUFLLElBQUksS0FBSzs7O2dCQUc3QjtnQkFDQTtjQUNGLEtBQUssS0FBSyxLQUFLLEtBQUssS0FBSyxJQUFJLEtBQUssSUFBSSxLQUFLLElBQUksS0FBSzs7O2dCQUdsRCxRQUFRLGlCQUFpQixPQUFPLE9BQU8sU0FBUyxPQUFPO2dCQUN2RDtnQkFDQSxPQUFPO2NBQ1QsS0FBSzs7Ozs7Z0JBS0gsS0FBSyxRQUFRLEtBQUssU0FBUyxRQUFRLFNBQVM7a0JBQzFDLFdBQVcsT0FBTyxXQUFXO2tCQUM3QixJQUFJLFdBQVcsSUFBSTs7O29CQUdqQjt5QkFDSyxJQUFJLFlBQVksSUFBSTs7OztvQkFJekIsV0FBVyxPQUFPLFdBQVcsRUFBRTtvQkFDL0IsUUFBUTtzQkFDTixLQUFLLElBQUksS0FBSyxJQUFJLEtBQUssSUFBSSxLQUFLLElBQUksS0FBSyxLQUFLLEtBQUssS0FBSyxLQUFLLEtBQUssS0FBSzs7d0JBRXJFLFNBQVMsVUFBVTt3QkFDbkI7d0JBQ0E7c0JBQ0YsS0FBSzs7Ozt3QkFJSCxRQUFRLEVBQUU7d0JBQ1YsS0FBSyxXQUFXLFFBQVEsR0FBRyxRQUFRLFVBQVUsU0FBUzswQkFDcEQsV0FBVyxPQUFPLFdBQVc7OzswQkFHN0IsSUFBSSxFQUFFLFlBQVksTUFBTSxZQUFZLE1BQU0sWUFBWSxNQUFNLFlBQVksT0FBTyxZQUFZLE1BQU0sWUFBWSxLQUFLOzs0QkFFaEg7Ozs7d0JBSUosU0FBUyxhQUFhLE9BQU8sT0FBTyxNQUFNLE9BQU87d0JBQ2pEO3NCQUNGOzt3QkFFRTs7eUJBRUM7b0JBQ0wsSUFBSSxZQUFZLElBQUk7OztzQkFHbEI7O29CQUVGLFdBQVcsT0FBTyxXQUFXO29CQUM3QixRQUFROztvQkFFUixPQUFPLFlBQVksTUFBTSxZQUFZLE1BQU0sWUFBWSxJQUFJO3NCQUN6RCxXQUFXLE9BQU8sV0FBVyxFQUFFOzs7b0JBR2pDLFNBQVMsT0FBTyxNQUFNLE9BQU87OztnQkFHakMsSUFBSSxPQUFPLFdBQVcsVUFBVSxJQUFJOztrQkFFbEM7a0JBQ0EsT0FBTzs7O2dCQUdUO2NBQ0Y7O2dCQUVFLFFBQVE7O2dCQUVSLElBQUksWUFBWSxJQUFJO2tCQUNsQixXQUFXO2tCQUNYLFdBQVcsT0FBTyxXQUFXLEVBQUU7OztnQkFHakMsSUFBSSxZQUFZLE1BQU0sWUFBWSxJQUFJOztrQkFFcEMsSUFBSSxZQUFZLE9BQU8sQ0FBQyxXQUFXLE9BQU8sV0FBVyxRQUFRLEtBQUssWUFBWSxNQUFNLFlBQVksS0FBSzs7b0JBRW5HOztrQkFFRixXQUFXOztrQkFFWCxPQUFPLFFBQVEsV0FBVyxDQUFDLFdBQVcsT0FBTyxXQUFXLFNBQVMsWUFBWSxNQUFNLFlBQVksS0FBSyxRQUFROzs7a0JBRzVHLElBQUksT0FBTyxXQUFXLFVBQVUsSUFBSTtvQkFDbEMsV0FBVyxFQUFFOztvQkFFYixPQUFPLFdBQVcsV0FBVyxDQUFDLFdBQVcsT0FBTyxXQUFXLFlBQVksWUFBWSxNQUFNLFlBQVksS0FBSyxXQUFXO29CQUNySCxJQUFJLFlBQVksT0FBTzs7c0JBRXJCOztvQkFFRixRQUFROzs7O2tCQUlWLFdBQVcsT0FBTyxXQUFXO2tCQUM3QixJQUFJLFlBQVksT0FBTyxZQUFZLElBQUk7b0JBQ3JDLFdBQVcsT0FBTyxXQUFXLEVBQUU7OztvQkFHL0IsSUFBSSxZQUFZLE1BQU0sWUFBWSxJQUFJO3NCQUNwQzs7O29CQUdGLEtBQUssV0FBVyxPQUFPLFdBQVcsV0FBVyxDQUFDLFdBQVcsT0FBTyxXQUFXLFlBQVksWUFBWSxNQUFNLFlBQVksS0FBSyxXQUFXO29CQUNySSxJQUFJLFlBQVksT0FBTzs7c0JBRXJCOztvQkFFRixRQUFROzs7a0JBR1YsT0FBTyxDQUFDLE9BQU8sTUFBTSxPQUFPOzs7Z0JBRzlCLElBQUksVUFBVTtrQkFDWjs7O2dCQUdGLElBQUksT0FBTyxNQUFNLE9BQU8sUUFBUSxNQUFNLFFBQVE7a0JBQzVDLFNBQVM7a0JBQ1QsT0FBTzt1QkFDRixJQUFJLE9BQU8sTUFBTSxPQUFPLFFBQVEsTUFBTSxTQUFTO2tCQUNwRCxTQUFTO2tCQUNULE9BQU87dUJBQ0YsSUFBSSxPQUFPLE1BQU0sT0FBTyxRQUFRLE1BQU0sUUFBUTtrQkFDbkQsU0FBUztrQkFDVCxPQUFPOzs7Z0JBR1Q7Ozs7O1VBS04sT0FBTzs7OztRQUlULElBQUksTUFBTSxVQUFVLE9BQU87VUFDekIsSUFBSSxTQUFTO1VBQ2IsSUFBSSxTQUFTLEtBQUs7O1lBRWhCOztVQUVGLElBQUksT0FBTyxTQUFTLFVBQVU7WUFDNUIsSUFBSSxDQUFDLGlCQUFpQixNQUFNLE9BQU8sS0FBSyxNQUFNLE9BQU8sS0FBSzs7Y0FFeEQsT0FBTyxNQUFNLE1BQU07OztZQUdyQixJQUFJLFNBQVMsS0FBSzs7Y0FFaEIsVUFBVTtjQUNWLFFBQVEsZUFBZSxhQUFhLE9BQU87Z0JBQ3pDLFFBQVE7O2dCQUVSLElBQUksU0FBUyxLQUFLO2tCQUNoQjs7Ozs7Z0JBS0YsSUFBSSxZQUFZO2tCQUNkLElBQUksU0FBUyxLQUFLO29CQUNoQixRQUFRO29CQUNSLElBQUksU0FBUyxLQUFLOztzQkFFaEI7O3lCQUVHOztvQkFFTDs7OztnQkFJSixJQUFJLFNBQVMsS0FBSztrQkFDaEI7O2dCQUVGLFFBQVEsS0FBSyxJQUFJOztjQUVuQixPQUFPO21CQUNGLElBQUksU0FBUyxLQUFLOztjQUV2QixVQUFVO2NBQ1YsUUFBUSxlQUFlLGFBQWEsT0FBTztnQkFDekMsUUFBUTs7Z0JBRVIsSUFBSSxTQUFTLEtBQUs7a0JBQ2hCOzs7O2dCQUlGLElBQUksWUFBWTtrQkFDZCxJQUFJLFNBQVMsS0FBSztvQkFDaEIsUUFBUTtvQkFDUixJQUFJLFNBQVMsS0FBSzs7c0JBRWhCOzt5QkFFRzs7b0JBRUw7Ozs7OztnQkFNSixJQUFJLFNBQVMsT0FBTyxPQUFPLFNBQVMsWUFBWSxDQUFDLGlCQUFpQixNQUFNLE9BQU8sS0FBSyxNQUFNLE9BQU8sT0FBTyxTQUFTLEtBQUs7a0JBQ3BIOztnQkFFRixRQUFRLE1BQU0sTUFBTSxNQUFNLElBQUk7O2NBRWhDLE9BQU87OztZQUdUOztVQUVGLE9BQU87Ozs7UUFJVCxJQUFJLFNBQVMsVUFBVSxRQUFRLFVBQVUsVUFBVTtVQUNqRCxJQUFJLFVBQVUsS0FBSyxRQUFRLFVBQVU7VUFDckMsSUFBSSxZQUFZLE9BQU87WUFDckIsT0FBTyxPQUFPO2lCQUNUO1lBQ0wsT0FBTyxZQUFZOzs7Ozs7O1FBT3ZCLElBQUksT0FBTyxVQUFVLFFBQVEsVUFBVSxVQUFVO1VBQy9DLElBQUksUUFBUSxPQUFPLFdBQVc7VUFDOUIsSUFBSSxPQUFPLFNBQVMsWUFBWSxPQUFPOzs7O1lBSXJDLElBQUksU0FBUyxLQUFLLFVBQVUsWUFBWTtjQUN0QyxLQUFLLFNBQVMsTUFBTSxRQUFRLFdBQVc7Z0JBQ3JDLE9BQU8sT0FBTyxRQUFROzttQkFFbkI7Y0FDTCxRQUFRLE9BQU8sVUFBVSxVQUFVO2dCQUNqQyxPQUFPLE9BQU8sVUFBVTs7OztVQUk5QixPQUFPLFNBQVMsS0FBSyxRQUFRLFVBQVU7Ozs7UUFJekMsUUFBUSxRQUFRLFVBQVUsUUFBUSxVQUFVO1VBQzFDLElBQUksUUFBUTtVQUNaLFFBQVE7VUFDUixTQUFTLEtBQUs7VUFDZCxTQUFTLElBQUk7O1VBRWIsSUFBSSxTQUFTLEtBQUs7WUFDaEI7OztVQUdGLFFBQVEsU0FBUztVQUNqQixPQUFPLFlBQVksU0FBUyxLQUFLLGFBQWEsZ0JBQWdCLE1BQU0sUUFBUSxJQUFJLE1BQU0sTUFBTSxRQUFRLFFBQVEsSUFBSSxZQUFZOzs7OztJQUtsSSxRQUFRLGtCQUFrQjtJQUMxQixPQUFPOzs7RUFHVCxJQUFJLGVBQWUsQ0FBQyxVQUFVOztJQUU1QixhQUFhLE1BQU07U0FDZDs7SUFFTCxJQUFJLGFBQWEsS0FBSztRQUNsQixlQUFlLEtBQUs7UUFDcEIsYUFBYTs7SUFFakIsSUFBSSxRQUFRLGFBQWEsT0FBTyxLQUFLLFdBQVc7OztNQUc5QyxjQUFjLFlBQVk7UUFDeEIsSUFBSSxDQUFDLFlBQVk7VUFDZixhQUFhO1VBQ2IsS0FBSyxPQUFPO1VBQ1osS0FBSyxXQUFXO1VBQ2hCLGFBQWEsZUFBZTs7UUFFOUIsT0FBTzs7OztJQUlYLEtBQUssT0FBTztNQUNWLFNBQVMsTUFBTTtNQUNmLGFBQWEsTUFBTTs7Ozs7RUFLdkIsSUFBSSxVQUFVO0lBQ1osT0FBTyxZQUFZO01BQ2pCLE9BQU87OztHQUdWLEtBQUs7QUFDUjs7O0FDdjZCQSxZQUFZLFdBQVc7RUFDckIsU0FBUztJQUNQO01BQ0UsUUFBUTtNQUNSLGVBQWU7O0lBRWpCO01BQ0UsUUFBUTs7SUFFVjtNQUNFLFFBQVE7OztFQUdaLGVBQWU7SUFDYixvQkFBb0I7TUFDbEIsUUFBUTtNQUNSLGNBQWM7UUFDWixRQUFRO1VBQ04sUUFBUTtVQUNSLGVBQWU7O1FBRWpCLFlBQVk7VUFDVixRQUFRO1VBQ1IsZUFBZTs7UUFFakIsUUFBUTtVQUNOLGVBQWU7VUFDZixRQUFROztRQUVWLGVBQWU7VUFDYixlQUFlO1VBQ2YsUUFBUTs7UUFFVixRQUFRO1VBQ04sUUFBUTtVQUNSLGVBQWU7O1FBRWpCLGFBQWE7VUFDWCxRQUFRO1VBQ1IsZUFBZTs7UUFFakIsVUFBVTtVQUNSLFFBQVE7VUFDUixlQUFlOzs7TUFHbkIsWUFBWTtRQUNWOzs7SUFHSixRQUFRO01BQ04sUUFBUTtNQUNSLFFBQVE7UUFDTjtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTs7O0lBR0osWUFBWTtNQUNWLFFBQVE7TUFDUixjQUFjO1FBQ1osT0FBTztVQUNMLFFBQVE7VUFDUixlQUFlOztRQUVqQixVQUFVO1VBQ1IsUUFBUTtVQUNSLGVBQWU7O1FBRWpCLEtBQUs7VUFDSCxRQUFRO1VBQ1IsZUFBZTs7UUFFakIsS0FBSztVQUNILFFBQVE7VUFDUixlQUFlOztRQUVqQixNQUFNO1VBQ0osUUFBUTtVQUNSLGVBQWU7O1FBRWpCLE1BQU07VUFDSixRQUFRO1VBQ1IsZUFBZTs7UUFFakIsU0FBUztVQUNQLFFBQVE7VUFDUixlQUFlOztRQUVqQixXQUFXO1VBQ1QsUUFBUTtVQUNSLGVBQWU7O1FBRWpCLFFBQVE7VUFDTixRQUFRO1VBQ1IsZUFBZTs7UUFFakIsU0FBUztVQUNQLFFBQVE7VUFDUixlQUFlOztRQUVqQixVQUFVO1VBQ1IsZUFBZTtVQUNmLFNBQVM7WUFDUDtjQUNFLFFBQVE7Y0FDUixlQUFlOztZQUVqQjtjQUNFLFFBQVE7Y0FDUixTQUFTO2dCQUNQLFFBQVE7Z0JBQ1IsZUFBZTs7Ozs7UUFLdkIsUUFBUTtVQUNOLFFBQVE7VUFDUixlQUFlOztRQUVqQixTQUFTO1VBQ1AsUUFBUTs7UUFFVixRQUFRO1VBQ04sZUFBZTtVQUNmLFNBQVM7WUFDUDtjQUNFLFFBQVE7O1lBRVY7Y0FDRSxRQUFRO2NBQ1IsU0FBUztnQkFDUCxRQUFROzs7OztRQUtoQixTQUFTO1VBQ1AsZUFBZTtVQUNmLFNBQVM7WUFDUDtjQUNFLFFBQVE7O1lBRVY7Y0FDRSxRQUFRO2NBQ1IsU0FBUztnQkFDUCxRQUFROzs7Ozs7O0lBT3BCLHNCQUFzQjtNQUNwQixRQUFRO01BQ1IsY0FBYztRQUNaLFFBQVE7VUFDTixTQUFTO1lBQ1A7Y0FDRSxRQUFROztZQUVWO2NBQ0UsUUFBUTs7OztRQUlkLFNBQVM7VUFDUCxRQUFROztRQUVWLFFBQVE7VUFDTixTQUFTO1lBQ1A7Y0FDRSxRQUFROztZQUVWO2NBQ0UsUUFBUTs7OztRQUlkLFNBQVM7VUFDUCxlQUFlO1VBQ2YsUUFBUTs7UUFFVixRQUFRO1VBQ04sUUFBUTtVQUNSLGVBQWU7O1FBRWpCLFNBQVM7VUFDUCxlQUFlO1VBQ2YsU0FBUztZQUNQO2NBQ0UsUUFBUTs7WUFFVjtjQUNFLFFBQVE7O1lBRVY7Y0FDRSxRQUFROzs7O1FBSWQsWUFBWTtVQUNWLFFBQVE7VUFDUixlQUFlOztRQUVqQixPQUFPO1VBQ0wsZUFBZTtVQUNmLFNBQVM7WUFDUDtjQUNFLFFBQVE7O1lBRVY7Y0FDRSxRQUFRO2NBQ1IsZUFBZTs7OztRQUlyQixhQUFhO1VBQ1gsUUFBUTtVQUNSLGVBQWU7O1FBRWpCLFNBQVM7VUFDUCxlQUFlO1VBQ2YsUUFBUTs7OztJQUlkLFFBQVE7TUFDTixRQUFRO01BQ1IsY0FBYztRQUNaLGNBQWM7VUFDWixlQUFlO1VBQ2YsUUFBUTs7UUFFVixVQUFVO1VBQ1IsZUFBZTtVQUNmLFFBQVE7O1FBRVYsVUFBVTtVQUNSLFFBQVE7VUFDUixlQUFlOztRQUVqQixTQUFTO1VBQ1AsZUFBZTtVQUNmLFFBQVE7O1FBRVYsVUFBVTtVQUNSLFFBQVE7VUFDUixTQUFTO1lBQ1AsUUFBUTs7O1FBR1osYUFBYTtVQUNYLGVBQWU7VUFDZixRQUFROztRQUVWLFNBQVM7VUFDUCxlQUFlO1VBQ2YsUUFBUTs7UUFFVixVQUFVO1VBQ1IsZUFBZTtVQUNmLFFBQVE7O1FBRVYsYUFBYTtVQUNYLGVBQWU7VUFDZixRQUFROztRQUVWLFFBQVE7VUFDTixlQUFlO1VBQ2YsUUFBUTs7UUFFVixhQUFhO1VBQ1gsZUFBZTtVQUNmLFFBQVE7O1FBRVYsWUFBWTtVQUNWLGVBQWU7VUFDZixRQUFRO1VBQ1IsU0FBUztZQUNQLFFBQVE7OztRQUdaLGVBQWU7VUFDYixlQUFlO1VBQ2YsUUFBUTs7UUFFVixhQUFhO1VBQ1gsZUFBZTtVQUNmLFFBQVE7O1FBRVYsVUFBVTtVQUNSLGVBQWU7VUFDZixRQUFROztRQUVWLGNBQWM7VUFDWixlQUFlO1VBQ2YsUUFBUTs7UUFFVixpQkFBaUI7VUFDZixlQUFlO1VBQ2YsUUFBUTs7UUFFVixrQkFBa0I7VUFDaEIsZUFBZTtVQUNmLFdBQVc7VUFDWCxRQUFROztRQUVWLG1CQUFtQjtVQUNqQixlQUFlO1VBQ2YsUUFBUTs7UUFFVixhQUFhO1VBQ1gsZUFBZTtVQUNmLFFBQVE7O1FBRVYsU0FBUztVQUNQLGVBQWU7VUFDZixXQUFXO1VBQ1gsUUFBUTs7UUFFVixhQUFhO1VBQ1gsZUFBZTtVQUNmLFFBQVE7O1FBRVYsa0JBQWtCO1VBQ2hCLGVBQWU7VUFDZixRQUFROztRQUVWLGlCQUFpQjtVQUNmLGVBQWU7VUFDZixRQUFROztRQUVWLHFCQUFxQjtVQUNuQixlQUFlO1VBQ2YsUUFBUTs7UUFFVixlQUFlO1VBQ2IsZUFBZTtVQUNmLFFBQVE7O1FBRVYsWUFBWTtVQUNWLGVBQWU7VUFDZixXQUFXO1VBQ1gsUUFBUTs7UUFFVixpQkFBaUI7VUFDZixlQUFlO1VBQ2YsV0FBVztVQUNYLFFBQVE7O1FBRVYsaUJBQWlCO1VBQ2YsZUFBZTtVQUNmLFdBQVc7VUFDWCxRQUFROztRQUVWLGVBQWU7VUFDYixlQUFlO1VBQ2YsV0FBVztVQUNYLFFBQVE7O1FBRVYsYUFBYTtVQUNYLGVBQWU7VUFDZixRQUFROztRQUVWLGNBQWM7VUFDWixlQUFlO1VBQ2YsUUFBUTs7UUFFVixhQUFhO1VBQ1gsZUFBZTtVQUNmLFFBQVE7O1FBRVYsaUJBQWlCO1VBQ2YsZUFBZTtVQUNmLFFBQVE7O1FBRVYsbUJBQW1CO1VBQ2pCLGVBQWU7VUFDZixRQUFROztRQUVWLGVBQWU7VUFDYixlQUFlO1VBQ2YsUUFBUTs7UUFFVixrQkFBa0I7VUFDaEIsZUFBZTtVQUNmLFdBQVc7VUFDWCxRQUFROztRQUVWLGtCQUFrQjtVQUNoQixlQUFlO1VBQ2YsUUFBUTs7UUFFVixjQUFjO1VBQ1osZUFBZTs7OztJQUlyQixjQUFjO01BQ1osUUFBUTtNQUNSLFFBQVE7UUFDTjtRQUNBO1FBQ0E7UUFDQTs7O0lBR0osU0FBUztNQUNQLFFBQVE7TUFDUixjQUFjO1FBQ1osUUFBUTtVQUNOLFFBQVE7O1FBRVYsVUFBVTtVQUNSLGVBQWU7VUFDZixTQUFTO1lBQ1A7Y0FDRSxRQUFRO2NBQ1IsU0FBUztnQkFDUCxRQUFROzs7WUFHWjtjQUNFLFFBQVE7Y0FDUixTQUFTO2dCQUNQLFFBQVE7Ozs7O1FBS2hCLFNBQVM7VUFDUCxlQUFlO1VBQ2YsU0FBUztZQUNQO2NBQ0UsUUFBUTs7WUFFVjtjQUNFLFFBQVE7Y0FDUixTQUFTO2dCQUNQLFFBQVE7OztZQUdaO2NBQ0UsUUFBUTtjQUNSLFNBQVM7Z0JBQ1AsUUFBUTs7Ozs7UUFLaEIsU0FBUztVQUNQLGVBQWU7VUFDZixRQUFROztRQUVWLFlBQVk7VUFDVixXQUFXO1VBQ1gsUUFBUTs7UUFFVixXQUFXO1VBQ1QsZUFBZTtVQUNmLFFBQVE7O1FBRVYsU0FBUztVQUNQLGVBQWU7VUFDZixRQUFROztRQUVWLFFBQVE7VUFDTixlQUFlO1VBQ2YsU0FBUztZQUNQO2NBQ0UsUUFBUTs7WUFFVjtjQUNFLFFBQVE7Ozs7UUFJZCxZQUFZO1VBQ1YsZUFBZTtVQUNmLFFBQVE7O1FBRVYsUUFBUTtVQUNOLGVBQWU7VUFDZixRQUFROztRQUVWLGdCQUFnQjtVQUNkLGVBQWU7VUFDZixRQUFROzs7O0lBSWQsYUFBYTtNQUNYLFFBQVE7TUFDUixRQUFRO1FBQ047UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBOzs7SUFHSixZQUFZO01BQ1YsUUFBUTtNQUNSLFFBQVE7UUFDTjtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTs7O0lBR0osYUFBYTtNQUNYLFFBQVE7TUFDUixjQUFjO1FBQ1osU0FBUztVQUNQLGVBQWU7VUFDZixRQUFROztRQUVWLE1BQU07VUFDSixRQUFRO1VBQ1IsZUFBZTs7UUFFakIsU0FBUztVQUNQLFFBQVE7OztNQUdaLFlBQVk7UUFDVjtRQUNBOzs7SUFHSixlQUFlO01BQ2IsUUFBUTtNQUNSLFFBQVE7UUFDTjtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBOzs7SUFHSixhQUFhO01BQ1gsUUFBUTtNQUNSLFFBQVE7UUFDTjtRQUNBO1FBQ0E7OztJQUdKLFFBQVE7TUFDTixRQUFRO01BQ1IsUUFBUTtRQUNOO1FBQ0E7UUFDQTtRQUNBOzs7SUFHSixZQUFZO01BQ1YsUUFBUTtNQUNSLFFBQVE7UUFDTjtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7OztJQUdKLE9BQU87TUFDTCxRQUFRO01BQ1IsY0FBYztRQUNaLE9BQU87VUFDTCxlQUFlO1VBQ2YsUUFBUTs7UUFFVixPQUFPO1VBQ0wsZUFBZTtVQUNmLFFBQVE7O1FBRVYsUUFBUTtVQUNOLGVBQWU7VUFDZixRQUFROztRQUVWLFFBQVE7VUFDTixlQUFlO1VBQ2YsUUFBUTs7UUFFVixTQUFTO1VBQ1AsZUFBZTtVQUNmLFFBQVE7VUFDUixTQUFTO1lBQ1AsUUFBUTs7O1FBR1osV0FBVztVQUNULGVBQWU7VUFDZixRQUFROztRQUVWLE9BQU87VUFDTCxlQUFlO1VBQ2YsUUFBUTtVQUNSLFNBQVM7WUFDUCxRQUFROzs7UUFHWixXQUFXO1VBQ1QsZUFBZTtVQUNmLFdBQVc7VUFDWCxRQUFROzs7O0lBSWQsd0JBQXdCO01BQ3RCLFFBQVE7TUFDUixjQUFjO1FBQ1osVUFBVTtVQUNSLFFBQVE7O1FBRVYsU0FBUztVQUNQLFFBQVE7O1FBRVYsUUFBUTtVQUNOLFNBQVM7WUFDUDtjQUNFLFFBQVE7O1lBRVY7Y0FDRSxRQUFROzs7O1FBSWQsU0FBUztVQUNQLGVBQWU7VUFDZixRQUFROztRQUVWLFFBQVE7VUFDTixRQUFRO1VBQ1IsZUFBZTs7UUFFakIsU0FBUztVQUNQLGVBQWU7VUFDZixTQUFTO1lBQ1A7Y0FDRSxRQUFROztZQUVWO2NBQ0UsUUFBUTs7WUFFVjtjQUNFLFFBQVE7Ozs7UUFJZCxZQUFZO1VBQ1YsUUFBUTtVQUNSLGVBQWU7O1FBRWpCLE9BQU87VUFDTCxlQUFlO1VBQ2YsU0FBUztZQUNQO2NBQ0UsUUFBUTs7WUFFVjtjQUNFLFFBQVE7Y0FDUixlQUFlOzs7O1FBSXJCLGFBQWE7VUFDWCxRQUFRO1VBQ1IsZUFBZTs7UUFFakIsU0FBUztVQUNQLGVBQWU7VUFDZixRQUFROzs7O0lBSWQsVUFBVTtNQUNSLFFBQVE7TUFDUixjQUFjO1FBQ1osVUFBVTtVQUNSLGVBQWU7VUFDZixRQUFROztRQUVWLFNBQVM7VUFDUCxlQUFlO1VBQ2YsUUFBUTs7UUFFVixVQUFVO1VBQ1IsZUFBZTtVQUNmLFFBQVE7VUFDUixTQUFTOztRQUVYLFVBQVU7VUFDUixlQUFlO1VBQ2YsUUFBUTs7UUFFVixVQUFVO1VBQ1IsZUFBZTtVQUNmLFFBQVE7O1FBRVYsV0FBVztVQUNULGVBQWU7VUFDZixRQUFROztRQUVWLFVBQVU7VUFDUixlQUFlO1VBQ2YsUUFBUTs7UUFFVix1QkFBdUI7VUFDckIsZUFBZTtVQUNmLFFBQVE7O1FBRVYsdUJBQXVCO1VBQ3JCLGVBQWU7VUFDZixRQUFROztRQUVWLGtCQUFrQjtVQUNoQixlQUFlO1VBQ2YsUUFBUTs7UUFFVixpQkFBaUI7VUFDZixlQUFlO1VBQ2YsUUFBUTs7UUFFVixjQUFjO1VBQ1osZUFBZTtVQUNmLFFBQVE7O1FBRVYsaUJBQWlCO1VBQ2YsZUFBZTtVQUNmLFFBQVE7O1FBRVYsY0FBYztVQUNaLGVBQWU7VUFDZixRQUFROztRQUVWLGFBQWE7VUFDWCxlQUFlO1VBQ2YsUUFBUTs7UUFFVixpQkFBaUI7VUFDZixlQUFlO1VBQ2YsUUFBUTs7UUFFVixlQUFlO1VBQ2IsZUFBZTtVQUNmLFFBQVE7O1FBRVYsbUJBQW1CO1VBQ2pCLGVBQWU7VUFDZixRQUFROztRQUVWLGVBQWU7VUFDYixlQUFlO1VBQ2YsUUFBUTs7UUFFVixlQUFlO1VBQ2IsZUFBZTtVQUNmLFFBQVE7O1FBRVYsY0FBYztVQUNaLGVBQWU7VUFDZixRQUFROztRQUVWLHFCQUFxQjtVQUNuQixlQUFlO1VBQ2YsUUFBUTs7UUFFVixjQUFjO1VBQ1osZUFBZTtVQUNmLFFBQVE7O1FBRVYsYUFBYTtVQUNYLGVBQWU7VUFDZixRQUFROztRQUVWLGlCQUFpQjtVQUNmLGVBQWU7VUFDZixRQUFROztRQUVWLG1CQUFtQjtVQUNqQixlQUFlO1VBQ2YsUUFBUTs7UUFFVixjQUFjO1VBQ1osZUFBZTs7OztJQUlyQixZQUFZO01BQ1YsUUFBUTtNQUNSLGNBQWM7UUFDWixTQUFTO1VBQ1AsZUFBZTtVQUNmLFFBQVE7O1FBRVYsUUFBUTtVQUNOLFFBQVE7VUFDUixlQUFlOztRQUVqQixTQUFTO1VBQ1AsZUFBZTtVQUNmLFNBQVM7WUFDUDtjQUNFLFFBQVE7O1lBRVY7Y0FDRSxRQUFROztZQUVWO2NBQ0UsUUFBUTs7OztRQUlkLFlBQVk7VUFDVixRQUFRO1VBQ1IsZUFBZTs7UUFFakIsT0FBTztVQUNMLGVBQWU7VUFDZixTQUFTO1lBQ1A7Y0FDRSxRQUFROztZQUVWO2NBQ0UsUUFBUTtjQUNSLGVBQWU7Ozs7UUFJckIsYUFBYTtVQUNYLFFBQVE7VUFDUixlQUFlOztRQUVqQixTQUFTO1VBQ1AsZUFBZTtVQUNmLFFBQVE7Ozs7SUFJZCxtQkFBbUI7TUFDakIsUUFBUTtNQUNSLGNBQWM7UUFDWixRQUFRO1VBQ04sUUFBUTs7UUFFVixTQUFTO1VBQ1AsZUFBZTtVQUNmLFFBQVE7O1FBRVYsUUFBUTtVQUNOLFFBQVE7VUFDUixlQUFlOztRQUVqQixTQUFTO1VBQ1AsZUFBZTtVQUNmLFNBQVM7WUFDUDtjQUNFLFFBQVE7O1lBRVY7Y0FDRSxRQUFROztZQUVWO2NBQ0UsUUFBUTs7OztRQUlkLFlBQVk7VUFDVixRQUFRO1VBQ1IsZUFBZTs7UUFFakIsT0FBTztVQUNMLGVBQWU7VUFDZixTQUFTO1lBQ1A7Y0FDRSxRQUFROztZQUVWO2NBQ0UsUUFBUTtjQUNSLGVBQWU7Ozs7UUFJckIsYUFBYTtVQUNYLFFBQVE7VUFDUixlQUFlOztRQUVqQixTQUFTO1VBQ1AsZUFBZTtVQUNmLFFBQVE7Ozs7SUFJZCxRQUFRO01BQ04sUUFBUTtNQUNSLGNBQWM7UUFDWixVQUFVO1VBQ1IsUUFBUTtVQUNSLGVBQWU7O1FBRWpCLE9BQU87VUFDTCxlQUFlO1VBQ2YsUUFBUTs7UUFFVixVQUFVO1VBQ1IsZUFBZTtVQUNmLFFBQVE7VUFDUixTQUFTOzs7O0lBSWYsY0FBYztNQUNaLFFBQVE7TUFDUixjQUFjO1FBQ1osUUFBUTtVQUNOLFFBQVE7VUFDUixlQUFlOztRQUVqQixZQUFZO1VBQ1YsZUFBZTtVQUNmLFFBQVE7O1FBRVYsV0FBVztVQUNULGVBQWU7VUFDZixRQUFROztRQUVWLFFBQVE7VUFDTixlQUFlO1VBQ2YsUUFBUTs7OztJQUlkLGtCQUFrQjtNQUNoQixRQUFRO01BQ1IsUUFBUTtRQUNOO1FBQ0E7UUFDQTtRQUNBOzs7SUFHSixhQUFhO01BQ1gsUUFBUTtNQUNSLGNBQWM7UUFDWixVQUFVO1VBQ1IsZUFBZTtVQUNmLFNBQVM7WUFDUDtjQUNFLFFBQVE7O1lBRVY7Y0FDRSxRQUFROztZQUVWO2NBQ0UsUUFBUTs7WUFFVjtjQUNFLFFBQVE7O1lBRVY7Y0FDRSxRQUFRO2NBQ1IsU0FBUztnQkFDUCxTQUFTO2tCQUNQO29CQUNFLFFBQVE7O2tCQUVWO29CQUNFLFFBQVE7O2tCQUVWO29CQUNFLFFBQVE7O2tCQUVWO29CQUNFLFFBQVE7Ozs7Ozs7UUFPcEIsaUJBQWlCO1VBQ2YsZUFBZTtVQUNmLFFBQVE7O1FBRVYsYUFBYTtVQUNYLGVBQWU7VUFDZixRQUFRO1VBQ1IsU0FBUztZQUNQLFFBQVE7WUFDUixlQUFlOzs7OztJQUt2QixlQUFlO01BQ2IsUUFBUTtNQUNSLGNBQWM7UUFDWixZQUFZO1VBQ1YsUUFBUTtVQUNSLGVBQWU7O1FBRWpCLFNBQVM7VUFDUCxlQUFlO1VBQ2YsUUFBUTs7UUFFVixTQUFTO1VBQ1AsZUFBZTtVQUNmLFNBQVM7WUFDUDtjQUNFLFFBQVE7O1lBRVY7Y0FDRSxRQUFROztZQUVWO2NBQ0UsUUFBUTs7WUFFVjtjQUNFLFFBQVE7Y0FDUixlQUFlOzs7OztNQUt2QixZQUFZO1FBQ1Y7UUFDQTs7O0lBR0osWUFBWTtNQUNWLFFBQVE7TUFDUixjQUFjO1FBQ1osUUFBUTtVQUNOLGVBQWU7VUFDZixRQUFROztRQUVWLFdBQVc7VUFDVCxlQUFlO1VBQ2YsUUFBUTs7UUFFVixTQUFTO1VBQ1AsZUFBZTtVQUNmLFNBQVM7WUFDUDtjQUNFLFFBQVE7O1lBRVY7Y0FDRSxRQUFROzs7O1FBSWQsUUFBUTtVQUNOLGVBQWU7VUFDZixRQUFROztRQUVWLE9BQU87VUFDTCxlQUFlO1VBQ2YsU0FBUztZQUNQO2NBQ0UsUUFBUTs7WUFFVjtjQUNFLFFBQVE7Ozs7UUFJZCxTQUFTO1VBQ1AsZUFBZTtVQUNmLFFBQVE7O1FBRVYsV0FBVztVQUNULGVBQWU7VUFDZixRQUFROztRQUVWLFdBQVc7VUFDVCxlQUFlO1VBQ2YsUUFBUTs7UUFFVixnQkFBZ0I7VUFDZCxlQUFlO1VBQ2YsUUFBUTs7OztJQUlkLGVBQWU7TUFDYixRQUFRO01BQ1IsY0FBYztRQUNaLFlBQVk7VUFDVixRQUFRO1VBQ1IsZUFBZTs7UUFFakIsU0FBUztVQUNQLGVBQWU7VUFDZixRQUFROztRQUVWLFNBQVM7VUFDUCxlQUFlO1VBQ2YsWUFBWTtVQUNaLFlBQVk7VUFDWixRQUFRO1VBQ1IsU0FBUztZQUNQLFNBQVM7Y0FDUDtnQkFDRSxRQUFROztjQUVWO2dCQUNFLFFBQVE7Z0JBQ1IsZUFBZTs7Ozs7O01BTXpCLFlBQVk7UUFDVjtRQUNBOzs7SUFHSixZQUFZO01BQ1YsUUFBUTtNQUNSLGNBQWM7UUFDWixZQUFZO1VBQ1YsUUFBUTtVQUNSLGVBQWU7O1FBRWpCLFNBQVM7VUFDUCxlQUFlO1VBQ2YsUUFBUTs7UUFFVixNQUFNO1VBQ0osZUFBZTtVQUNmLFFBQVE7VUFDUixTQUFTO1lBQ1AsU0FBUztjQUNQO2dCQUNFLFFBQVE7O2NBRVY7Z0JBQ0UsUUFBUTs7Y0FFVjtnQkFDRSxRQUFROztjQUVWO2dCQUNFLFFBQVE7Z0JBQ1IsZUFBZTs7Ozs7O01BTXpCLFlBQVk7UUFDVjtRQUNBOzs7SUFHSixXQUFXO01BQ1QsUUFBUTtNQUNSLGNBQWM7UUFDWixTQUFTO1VBQ1AsZUFBZTtVQUNmLFFBQVE7O1FBRVYsUUFBUTtVQUNOLGVBQWU7VUFDZixRQUFROzs7TUFHWixZQUFZO1FBQ1Y7UUFDQTs7O0lBR0osVUFBVTtNQUNSLFFBQVE7TUFDUixjQUFjO1FBQ1osWUFBWTtVQUNWLGVBQWU7VUFDZixRQUFROztRQUVWLGNBQWM7VUFDWixlQUFlO1VBQ2YsUUFBUTs7UUFFVixnQkFBZ0I7VUFDZCxlQUFlO1VBQ2YsUUFBUTs7UUFFVixjQUFjO1VBQ1osZUFBZTtVQUNmLFFBQVE7O1FBRVYsY0FBYztVQUNaLGVBQWU7VUFDZixRQUFROztRQUVWLFFBQVE7VUFDTixRQUFRO1VBQ1IsZUFBZTs7UUFFakIsUUFBUTtVQUNOLFFBQVE7VUFDUixlQUFlOztRQUVqQixXQUFXO1VBQ1QsUUFBUTtVQUNSLGVBQWU7O1FBRWpCLFNBQVM7VUFDUCxRQUFRO1VBQ1IsZUFBZTs7UUFFakIsUUFBUTtVQUNOLFFBQVE7VUFDUixlQUFlOztRQUVqQixVQUFVO1VBQ1IsUUFBUTtVQUNSLGVBQWU7O1FBRWpCLFNBQVM7VUFDUCxRQUFRO1VBQ1IsZUFBZTs7OztJQUlyQixjQUFjO01BQ1osUUFBUTtNQUNSLGNBQWM7UUFDWixTQUFTO1VBQ1AsUUFBUTs7UUFFVixVQUFVO1VBQ1IsUUFBUTs7UUFFVixRQUFRO1VBQ04sUUFBUTs7UUFFVixRQUFRO1VBQ04sZUFBZTtVQUNmLFVBQVU7VUFDVixRQUFROztRQUVWLGVBQWU7VUFDYixlQUFlO1VBQ2YsUUFBUTs7UUFFVixVQUFVO1VBQ1IsZUFBZTtVQUNmLFFBQVE7O1FBRVYsaUJBQWlCO1VBQ2YsZUFBZTtVQUNmLFFBQVE7O1FBRVYsZUFBZTtVQUNiLGVBQWU7VUFDZixRQUFROztRQUVWLGNBQWM7VUFDWixlQUFlO1VBQ2YsUUFBUTtVQUNSLFNBQVM7WUFDUCxRQUFROzs7UUFHWixvQkFBb0I7VUFDbEIsZUFBZTtVQUNmLFFBQVE7Ozs7SUFJZCxjQUFjO01BQ1osUUFBUTtNQUNSLGNBQWM7UUFDWixVQUFVO1VBQ1IsZUFBZTtVQUNmLFFBQVE7O1FBRVYsU0FBUztVQUNQLGVBQWU7VUFDZixVQUFVO1VBQ1YsUUFBUTs7UUFFVixRQUFRO1VBQ04sZUFBZTtVQUNmLFVBQVU7VUFDVixRQUFROztRQUVWLFVBQVU7VUFDUixlQUFlO1VBQ2YsVUFBVTtVQUNWLFFBQVE7O1FBRVYsV0FBVztVQUNULFdBQVc7VUFDWCxXQUFXO1VBQ1gsUUFBUTs7UUFFVixlQUFlO1VBQ2IsV0FBVztVQUNYLFdBQVc7VUFDWCxRQUFROztRQUVWLGlCQUFpQjtVQUNmLFdBQVc7VUFDWCxXQUFXO1VBQ1gsUUFBUTs7UUFFVixlQUFlO1VBQ2IsV0FBVztVQUNYLFFBQVE7O1FBRVYsY0FBYztVQUNaLGVBQWU7VUFDZixRQUFRO1VBQ1IsU0FBUztZQUNQLFFBQVE7OztRQUdaLG9CQUFvQjtVQUNsQixlQUFlO1VBQ2YsUUFBUTs7UUFFVixXQUFXO1VBQ1QsUUFBUTs7UUFFVixVQUFVO1VBQ1IsUUFBUTtVQUNSLGVBQWU7O1FBRWpCLGVBQWU7VUFDYixRQUFRO1VBQ1IsZUFBZTs7UUFFakIsV0FBVztVQUNULGVBQWU7VUFDZixRQUFROztRQUVWLFlBQVk7VUFDVixlQUFlO1VBQ2YsUUFBUTs7UUFFVixZQUFZO1VBQ1YsZUFBZTtVQUNmLFFBQVE7O1FBRVYsV0FBVztVQUNULGVBQWU7VUFDZixRQUFROztRQUVWLGVBQWU7VUFDYixlQUFlO1VBQ2YsUUFBUTs7UUFFVixTQUFTO1VBQ1AsZUFBZTtVQUNmLFNBQVM7WUFDUDtjQUNFLFFBQVE7O1lBRVY7Y0FDRSxRQUFROzs7O1FBSWQsUUFBUTtVQUNOLGVBQWU7VUFDZixRQUFROztRQUVWLFlBQVk7VUFDVixlQUFlO1VBQ2YsUUFBUTs7UUFFVixpQkFBaUI7VUFDZixlQUFlO1VBQ2YsUUFBUTs7UUFFVixTQUFTO1VBQ1AsUUFBUTtVQUNSLGVBQWU7O1FBRWpCLFNBQVM7VUFDUCxlQUFlO1VBQ2YsUUFBUTs7UUFFVixZQUFZO1VBQ1YsUUFBUTtVQUNSLGVBQWU7O1FBRWpCLE1BQU07VUFDSixlQUFlO1VBQ2YsUUFBUTs7UUFFVixNQUFNO1VBQ0osZUFBZTtVQUNmLFFBQVE7O1FBRVYsVUFBVTtVQUNSLGVBQWU7VUFDZixRQUFROztRQUVWLFNBQVM7VUFDUCxlQUFlO1VBQ2YsUUFBUTs7UUFFVixRQUFRO1VBQ04sZUFBZTtVQUNmLFFBQVE7O1FBRVYsWUFBWTtVQUNWLGVBQWU7VUFDZixRQUFROztRQUVWLGFBQWE7VUFDWCxRQUFRO1VBQ1IsZUFBZTs7UUFFakIsY0FBYztVQUNaLFFBQVE7VUFDUixlQUFlOztRQUVqQixVQUFVO1VBQ1IsZUFBZTtVQUNmLFFBQVE7O1FBRVYsbUJBQW1CO1VBQ2pCLGVBQWU7VUFDZixRQUFROztRQUVWLFFBQVE7VUFDTixlQUFlO1VBQ2YsUUFBUTs7UUFFViwwQkFBMEI7VUFDeEIsZUFBZTtVQUNmLFFBQVE7Ozs7SUFJZCxlQUFlO01BQ2IsUUFBUTtNQUNSLFFBQVE7UUFDTjtRQUNBO1FBQ0E7UUFDQTs7O0lBR0osVUFBVTtNQUNSLFFBQVE7TUFDUixRQUFRO1FBQ047UUFDQTs7O0lBR0osZUFBZTtNQUNiLFFBQVE7TUFDUixRQUFRO1FBQ047UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7OztJQUdKLFNBQVM7TUFDUCxRQUFRO01BQ1IsUUFBUTtRQUNOO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTs7O0lBR0osbUJBQW1CO01BQ2pCLFFBQVE7TUFDUixRQUFRO1FBQ047UUFDQTtRQUNBOzs7SUFHSixpQkFBaUI7TUFDZixRQUFRO01BQ1IsUUFBUTtRQUNOO1FBQ0E7UUFDQTs7O0lBR0osYUFBYTtNQUNYLFFBQVE7TUFDUixRQUFRO1FBQ047UUFDQTs7O0lBR0osY0FBYztNQUNaLFFBQVE7TUFDUixRQUFRO1FBQ047UUFDQTs7O0lBR0osaUJBQWlCO01BQ2YsUUFBUTtNQUNSLGNBQWM7UUFDWixRQUFRO1VBQ04sZUFBZTtVQUNmLFFBQVE7O1FBRVYsUUFBUTtVQUNOLFFBQVE7VUFDUixlQUFlOztRQUVqQixjQUFjO1VBQ1osUUFBUTtVQUNSLGVBQWU7O1FBRWpCLGFBQWE7VUFDWCxRQUFRO1VBQ1IsZUFBZTs7OztJQUlyQixlQUFlO01BQ2IsUUFBUTtNQUNSLFFBQVE7UUFDTjtRQUNBO1FBQ0E7OztJQUdKLGVBQWU7TUFDYixRQUFRO01BQ1IsY0FBYztRQUNaLFNBQVM7VUFDUCxlQUFlO1VBQ2YsUUFBUTs7UUFFVixpQkFBaUI7VUFDZixlQUFlO1VBQ2YsV0FBVztVQUNYLFFBQVE7O1FBRVYsWUFBWTtVQUNWLGVBQWU7VUFDZixXQUFXO1VBQ1gsUUFBUTs7UUFFVixXQUFXO1VBQ1QsZUFBZTtVQUNmLFFBQVE7VUFDUixTQUFTO1lBQ1AsUUFBUTs7O1FBR1osV0FBVztVQUNULGVBQWU7VUFDZixRQUFROztRQUVWLGdCQUFnQjtVQUNkLGVBQWU7VUFDZixRQUFROztRQUVWLHFCQUFxQjtVQUNuQixlQUFlO1VBQ2YsU0FBUztZQUNQO2NBQ0UsUUFBUTs7WUFFVjtjQUNFLFFBQVE7Y0FDUixTQUFTO2dCQUNQLFFBQVE7Ozs7O1FBS2hCLHdCQUF3QjtVQUN0QixlQUFlO1VBQ2YsU0FBUztZQUNQO2NBQ0UsUUFBUTs7WUFFVjtjQUNFLFFBQVE7Y0FDUixTQUFTO2dCQUNQLFFBQVE7Ozs7O1FBS2hCLGNBQWM7VUFDWixlQUFlO1VBQ2YsU0FBUztZQUNQO2NBQ0UsUUFBUTs7WUFFVjtjQUNFLFFBQVE7Y0FDUixTQUFTO2dCQUNQLFFBQVE7Ozs7O1FBS2hCLGdCQUFnQjtVQUNkLGVBQWU7VUFDZixRQUFRO1VBQ1IsU0FBUztZQUNQLFFBQVE7OztRQUdaLGlCQUFpQjtVQUNmLGVBQWU7VUFDZixRQUFRO1VBQ1IsU0FBUztZQUNQLFFBQVE7OztRQUdaLGlCQUFpQjtVQUNmLGVBQWU7VUFDZixRQUFRO1VBQ1IsU0FBUztZQUNQLFFBQVE7OztRQUdaLGlCQUFpQjtVQUNmLGVBQWU7VUFDZixRQUFRO1VBQ1IsU0FBUztZQUNQLFFBQVE7OztRQUdaLGtCQUFrQjtVQUNoQixlQUFlO1VBQ2YsUUFBUTtVQUNSLFNBQVM7WUFDUCxRQUFROzs7OztJQUtoQixjQUFjO01BQ1osUUFBUTtNQUNSLGNBQWM7UUFDWixhQUFhO1VBQ1gsZUFBZTtVQUNmLFFBQVE7O1FBRVYsU0FBUztVQUNQLGVBQWU7VUFDZixRQUFROztRQUVWLFVBQVU7VUFDUixlQUFlO1VBQ2YsUUFBUTs7UUFFVixhQUFhO1VBQ1gsZUFBZTtVQUNmLFFBQVE7O1FBRVYsUUFBUTtVQUNOLGVBQWU7VUFDZixRQUFROztRQUVWLGFBQWE7VUFDWCxlQUFlO1VBQ2YsUUFBUTs7UUFFVixZQUFZO1VBQ1YsZUFBZTtVQUNmLFFBQVE7VUFDUixTQUFTO1lBQ1AsUUFBUTs7O1FBR1osZUFBZTtVQUNiLGVBQWU7VUFDZixRQUFROztRQUVWLGFBQWE7VUFDWCxlQUFlO1VBQ2YsUUFBUTs7UUFFVixVQUFVO1VBQ1IsZUFBZTtVQUNmLFFBQVE7O1FBRVYsY0FBYztVQUNaLGVBQWU7VUFDZixRQUFROztRQUVWLGNBQWM7VUFDWixlQUFlO1VBQ2YsUUFBUTs7UUFFVixpQkFBaUI7VUFDZixlQUFlO1VBQ2YsUUFBUTs7UUFFVixrQkFBa0I7VUFDaEIsZUFBZTtVQUNmLFdBQVc7VUFDWCxRQUFROztRQUVWLG1CQUFtQjtVQUNqQixlQUFlO1VBQ2YsUUFBUTs7UUFFVixhQUFhO1VBQ1gsZUFBZTtVQUNmLFFBQVE7O1FBRVYsU0FBUztVQUNQLGVBQWU7VUFDZixXQUFXO1VBQ1gsUUFBUTs7UUFFVixhQUFhO1VBQ1gsZUFBZTtVQUNmLFFBQVE7O1FBRVYsa0JBQWtCO1VBQ2hCLGVBQWU7VUFDZixRQUFROztRQUVWLGlCQUFpQjtVQUNmLGVBQWU7VUFDZixRQUFROztRQUVWLHFCQUFxQjtVQUNuQixlQUFlO1VBQ2YsUUFBUTs7UUFFVixlQUFlO1VBQ2IsZUFBZTtVQUNmLFFBQVE7O1FBRVYsWUFBWTtVQUNWLGVBQWU7VUFDZixXQUFXO1VBQ1gsUUFBUTs7UUFFVixpQkFBaUI7VUFDZixlQUFlO1VBQ2YsV0FBVztVQUNYLFFBQVE7O1FBRVYsaUJBQWlCO1VBQ2YsZUFBZTtVQUNmLFdBQVc7VUFDWCxRQUFROztRQUVWLGVBQWU7VUFDYixlQUFlO1VBQ2YsV0FBVztVQUNYLFFBQVE7O1FBRVYsYUFBYTtVQUNYLGVBQWU7VUFDZixRQUFROztRQUVWLGNBQWM7VUFDWixlQUFlO1VBQ2YsUUFBUTs7UUFFVixhQUFhO1VBQ1gsZUFBZTtVQUNmLFFBQVE7O1FBRVYsaUJBQWlCO1VBQ2YsZUFBZTtVQUNmLFFBQVE7O1FBRVYsbUJBQW1CO1VBQ2pCLGVBQWU7VUFDZixRQUFROztRQUVWLGVBQWU7VUFDYixlQUFlO1VBQ2YsUUFBUTs7UUFFVixrQkFBa0I7VUFDaEIsZUFBZTtVQUNmLFdBQVc7VUFDWCxRQUFROztRQUVWLGtCQUFrQjtVQUNoQixlQUFlO1VBQ2YsUUFBUTs7UUFFVixjQUFjO1VBQ1osZUFBZTs7OztJQUlyQixnQkFBZ0I7TUFDZCxRQUFRO01BQ1IsY0FBYztRQUNaLFVBQVU7VUFDUixlQUFlO1VBQ2YsUUFBUTs7UUFFVixVQUFVO1VBQ1IsZUFBZTtVQUNmLFFBQVE7O1FBRVYsV0FBVztVQUNULGVBQWU7VUFDZixRQUFROztRQUVWLFVBQVU7VUFDUixlQUFlO1VBQ2YsUUFBUTs7UUFFVix1QkFBdUI7VUFDckIsZUFBZTtVQUNmLFFBQVE7O1FBRVYsdUJBQXVCO1VBQ3JCLGVBQWU7VUFDZixRQUFROztRQUVWLGtCQUFrQjtVQUNoQixlQUFlO1VBQ2YsUUFBUTs7UUFFVixpQkFBaUI7VUFDZixlQUFlO1VBQ2YsUUFBUTs7UUFFVixjQUFjO1VBQ1osZUFBZTtVQUNmLFFBQVE7O1FBRVYsaUJBQWlCO1VBQ2YsZUFBZTtVQUNmLFFBQVE7O1FBRVYsY0FBYztVQUNaLGVBQWU7VUFDZixRQUFROztRQUVWLGFBQWE7VUFDWCxlQUFlO1VBQ2YsUUFBUTs7UUFFVixpQkFBaUI7VUFDZixlQUFlO1VBQ2YsUUFBUTs7UUFFVixlQUFlO1VBQ2IsZUFBZTtVQUNmLFFBQVE7O1FBRVYsbUJBQW1CO1VBQ2pCLGVBQWU7VUFDZixRQUFROztRQUVWLGVBQWU7VUFDYixlQUFlO1VBQ2YsUUFBUTs7UUFFVixlQUFlO1VBQ2IsZUFBZTtVQUNmLFFBQVE7O1FBRVYsY0FBYztVQUNaLGVBQWU7VUFDZixRQUFROztRQUVWLHFCQUFxQjtVQUNuQixlQUFlO1VBQ2YsUUFBUTs7UUFFVixjQUFjO1VBQ1osZUFBZTtVQUNmLFFBQVE7O1FBRVYsYUFBYTtVQUNYLGVBQWU7VUFDZixRQUFROztRQUVWLGlCQUFpQjtVQUNmLGVBQWU7VUFDZixRQUFROztRQUVWLG1CQUFtQjtVQUNqQixlQUFlO1VBQ2YsUUFBUTs7UUFFVixjQUFjO1VBQ1osZUFBZTs7OztJQUlyQixlQUFlO01BQ2IsUUFBUTtNQUNSLGNBQWM7UUFDWixTQUFTO1VBQ1AsUUFBUTtVQUNSLGVBQWU7O1FBRWpCLFFBQVE7VUFDTixRQUFRO1VBQ1IsZUFBZTs7UUFFakIsUUFBUTtVQUNOLFFBQVE7VUFDUixlQUFlOztRQUVqQixRQUFRO1VBQ04sUUFBUTtVQUNSLGVBQWU7Ozs7SUFJckIsb0JBQW9CO01BQ2xCLFFBQVE7TUFDUixjQUFjO1FBQ1osU0FBUztVQUNQLFFBQVE7O1FBRVYsV0FBVztVQUNULFFBQVE7Ozs7SUFJZCxtQkFBbUI7TUFDakIsUUFBUTtNQUNSLGNBQWM7UUFDWixTQUFTO1VBQ1AsVUFBVTtVQUNWLFFBQVE7O1FBRVYsV0FBVztVQUNULFFBQVE7O1FBRVYsVUFBVTtVQUNSLFFBQVE7Ozs7SUFJZCxhQUFhO01BQ1gsUUFBUTtNQUNSLGNBQWM7UUFDWixTQUFTO1VBQ1AsUUFBUTs7UUFFVixRQUFRO1VBQ04sU0FBUztZQUNQO2NBQ0UsUUFBUTs7WUFFVjtjQUNFLFFBQVE7Ozs7UUFJZCxRQUFRO1VBQ04sZUFBZTtVQUNmLFFBQVE7O1FBRVYsZUFBZTtVQUNiLGVBQWU7VUFDZixRQUFROztRQUVWLFFBQVE7VUFDTixRQUFRO1VBQ1IsZUFBZTs7UUFFakIsYUFBYTtVQUNYLFFBQVE7VUFDUixlQUFlOztRQUVqQixVQUFVO1VBQ1IsUUFBUTtVQUNSLGVBQWU7OztNQUduQixZQUFZO1FBQ1Y7UUFDQTs7O0lBR0osU0FBUztNQUNQLFFBQVE7TUFDUixjQUFjO1FBQ1osT0FBTztVQUNMLFFBQVE7O1FBRVYsVUFBVTtVQUNSLFFBQVE7Ozs7SUFJZCxhQUFhO01BQ1gsUUFBUTtNQUNSLGNBQWM7UUFDWixVQUFVO1VBQ1IsZUFBZTtVQUNmLFFBQVE7VUFDUixTQUFTO1lBQ1AsUUFBUTs7O1FBR1osUUFBUTtVQUNOLGVBQWU7VUFDZixRQUFROztRQUVWLGVBQWU7VUFDYixlQUFlO1VBQ2YsUUFBUTs7UUFFVixRQUFRO1VBQ04sUUFBUTtVQUNSLGVBQWU7O1FBRWpCLGFBQWE7VUFDWCxRQUFRO1VBQ1IsZUFBZTs7UUFFakIsVUFBVTtVQUNSLFFBQVE7VUFDUixlQUFlOzs7TUFHbkIsWUFBWTtRQUNWOzs7SUFHSixZQUFZO01BQ1YsUUFBUTtNQUNSLGNBQWM7UUFDWixRQUFRO1VBQ04sUUFBUTtVQUNSLGVBQWU7O1FBRWpCLFlBQVk7VUFDVixRQUFRO1VBQ1IsZUFBZTs7UUFFakIsUUFBUTtVQUNOLGVBQWU7VUFDZixRQUFROztRQUVWLGVBQWU7VUFDYixlQUFlO1VBQ2YsUUFBUTs7UUFFVixRQUFRO1VBQ04sUUFBUTtVQUNSLGVBQWU7O1FBRWpCLGFBQWE7VUFDWCxRQUFRO1VBQ1IsZUFBZTs7UUFFakIsVUFBVTtVQUNSLFFBQVE7VUFDUixlQUFlOzs7TUFHbkIsWUFBWTtRQUNWOzs7SUFHSixnQkFBZ0I7TUFDZCxRQUFRO01BQ1IsY0FBYztRQUNaLEtBQUs7VUFDSCxRQUFRO1VBQ1IsZUFBZTs7UUFFakIsS0FBSztVQUNILFFBQVE7VUFDUixlQUFlOztRQUVqQixNQUFNO1VBQ0osUUFBUTtVQUNSLGVBQWU7O1FBRWpCLE1BQU07VUFDSixRQUFRO1VBQ1IsZUFBZTs7UUFFakIsU0FBUztVQUNQLFFBQVE7VUFDUixlQUFlOztRQUVqQixXQUFXO1VBQ1QsUUFBUTtVQUNSLGVBQWU7O1FBRWpCLFFBQVE7VUFDTixRQUFRO1VBQ1IsZUFBZTs7UUFFakIsU0FBUztVQUNQLFFBQVE7VUFDUixlQUFlOztRQUVqQixVQUFVO1VBQ1IsZUFBZTtVQUNmLFNBQVM7WUFDUDtjQUNFLFFBQVE7Y0FDUixlQUFlOztZQUVqQjtjQUNFLFFBQVE7Y0FDUixTQUFTO2dCQUNQLFFBQVE7Z0JBQ1IsZUFBZTs7Ozs7UUFLdkIsUUFBUTtVQUNOLFFBQVE7VUFDUixlQUFlOztRQUVqQixTQUFTO1VBQ1AsUUFBUTs7UUFFVixRQUFRO1VBQ04sZUFBZTtVQUNmLFNBQVM7WUFDUDtjQUNFLFFBQVE7O1lBRVY7Y0FDRSxRQUFRO2NBQ1IsU0FBUztnQkFDUCxRQUFROzs7OztRQUtoQixTQUFTO1VBQ1AsZUFBZTtVQUNmLFNBQVM7WUFDUDtjQUNFLFFBQVE7O1lBRVY7Y0FDRSxRQUFRO2NBQ1IsU0FBUztnQkFDUCxRQUFROzs7Ozs7OztFQVF0QixXQUFXO0VBQ1g7Ozs7QUM1cUVGOzs7QUFHQSxRQUFRLE9BQU8sUUFBUTtJQUNuQjtJQUNBO0lBQ0E7SUFDQTs7R0FFRCxTQUFTLEtBQUssT0FBTzs7R0FFckIsU0FBUyxNQUFNLE9BQU87R0FDdEIsU0FBUyxPQUFPLE9BQU87R0FDdkIsU0FBUyxZQUFZLE9BQU87R0FDNUIsU0FBUyxNQUFNLE9BQU87R0FDdEIsU0FBUyxRQUFRLE9BQU8sR0FBRzs7R0FFM0IsU0FBUyxVQUFVLE9BQU87R0FDMUIsU0FBUyxRQUFRLE9BQU87R0FDeEIsU0FBUyxRQUFRLE9BQU87R0FDeEIsU0FBUyxPQUFPLE9BQU87R0FDdkIsU0FBUyxRQUFRLE9BQU87R0FDeEIsU0FBUyxRQUFRLE9BQU87O0dBRXhCLFNBQVMsU0FBUyxPQUFPLE1BQU07R0FDL0IsU0FBUyxPQUFPOztHQUVoQixTQUFTLFVBQVU7SUFDbEIsVUFBVTtJQUNWLE9BQU87SUFDUCxRQUFRO0lBQ1IsU0FBUztJQUNULFVBQVU7SUFDVixlQUFlO0lBQ2YsYUFBYTtJQUNiLGtCQUFrQjtJQUNsQixPQUFPOztJQUVQLGNBQWMsT0FBTyxZQUFZO0lBQ2pDLFVBQVU7TUFDUixVQUFVO01BQ1YsT0FBTztNQUNQLFNBQVM7O0lBRVgsV0FBVztJQUNYLGVBQWU7O0FBRW5COzs7QUMvQ0EsUUFBUSxPQUFPLFFBQVEsSUFBSSxDQUFDLGtCQUFrQixTQUFTLGdCQUFnQixDQUFDLGVBQWUsSUFBSSwrQkFBK0I7QUFDMUgsZUFBZSxJQUFJLDZCQUE2QjtBQUNoRCxlQUFlLElBQUksbUNBQW1DO0FBQ3RELGVBQWUsSUFBSSw0QkFBNEI7QUFDL0MsZUFBZSxJQUFJLCtCQUErQjtBQUNsRCxlQUFlLElBQUksNEJBQTRCO0FBQy9DLGVBQWUsSUFBSSw0QkFBNEI7QUFDL0MsZUFBZSxJQUFJLDhDQUE4QztBQUNqRSxlQUFlLElBQUksNENBQTRDO0FBQy9ELGVBQWUsSUFBSSw0Q0FBNEM7QUFDL0QsZUFBZSxJQUFJLHNDQUFzQztBQUN6RCxlQUFlLElBQUksZ0RBQWdEO0FBQ25FLGVBQWUsSUFBSSw4QkFBOEI7QUFDakQsZUFBZSxJQUFJLHlDQUF5QztBQUM1RCxlQUFlLElBQUksZ0RBQWdEO0FBQ25FLGVBQWUsSUFBSSx3Q0FBd0M7QUFDM0QsZUFBZSxJQUFJLDRDQUE0QztBQUMvRCxlQUFlLElBQUksa0NBQWtDO0FBQ3JELGVBQWUsSUFBSSwyQkFBMkI7QUFDOUMsZUFBZSxJQUFJLDhCQUE4QjtBQUNqRCxlQUFlLElBQUksZ0NBQWdDO0FBQ25ELGVBQWUsSUFBSSwwQ0FBMEM7QUFDN0QsZUFBZSxJQUFJLCtDQUErQztBQUNsRSxlQUFlLElBQUksa0RBQWtELGk0QkFBaTRCOzs7O0FDdkJ0OEI7Ozs7Ozs7O0FBUUEsUUFBUSxPQUFPO0dBQ1osVUFBVSxrREFBbUIsVUFBVSxPQUFPLFNBQVMsUUFBUTtJQUM5RCxPQUFPO01BQ0wsYUFBYTtNQUNiLFVBQVU7TUFDVixTQUFTO01BQ1QsU0FBUztNQUNULE9BQU87TUFDUCxNQUFNLFNBQVMsU0FBUyxPQUFPLFNBQVMsT0FBTyxpQkFBaUI7OztRQUc5RCxTQUFTLGFBQWE7VUFDcEIsSUFBSSxpQkFBaUI7WUFDbkIsZ0JBQWdCOzs7OztRQUtwQixNQUFNLGVBQWUsT0FBTztRQUM1QixNQUFNLGdCQUFnQjtRQUN0QixNQUFNLGVBQWU7O1FBRXJCLE1BQU0sZUFBZSxTQUFTLE9BQU87VUFDbkMsT0FBTyxNQUFNLElBQUksTUFBTSxlQUFlLHdCQUF3QjthQUMzRCxLQUFLLFNBQVMsVUFBVTtjQUN2QixNQUFNLGdCQUFnQixTQUFTOzs7OztRQUtyQyxNQUFNLGFBQWE7O1FBRW5CLE1BQU0sYUFBYSxTQUFTLFNBQVM7VUFDbkMsT0FBTyxRQUFRLFdBQVcsTUFBTSxRQUFRLGNBQWMsTUFBTSxRQUFROzs7UUFHdEUsTUFBTSxhQUFhLFNBQVMsY0FBYztVQUN4QyxJQUFJLFVBQVU7WUFDWixPQUFPO1lBQ1AsTUFBTSxhQUFhO1lBQ25CLEtBQUssTUFBTSxlQUFlLG1CQUFtQixhQUFhO2NBQ3hELGNBQWMsYUFBYTtjQUMzQixlQUFlLGFBQWEsZUFBZTs7O1VBRy9DLFFBQVEsT0FBTztVQUNmLFFBQVEsVUFBVSxRQUFRLElBQUk7VUFDOUIsUUFBUSxPQUFPLFFBQVE7O1VBRXZCOzs7OztBQUtWOzs7QUM5REE7Ozs7Ozs7O0FBUUEsUUFBUSxPQUFPO0dBQ1osVUFBVSx1Q0FBaUIsVUFBVSxTQUFTLFFBQVE7SUFDckQsT0FBTztNQUNMLGFBQWE7TUFDYixVQUFVO01BQ1YsU0FBUztNQUNULFNBQVM7TUFDVCxPQUFPO01BQ1AsTUFBTSxTQUFTLFNBQVMsT0FBTyxTQUFTLE9BQU8saUJBQWlCOzs7UUFHOUQsU0FBUyxhQUFhO1VBQ3BCLElBQUksaUJBQWlCO1lBQ25CLGdCQUFnQjs7Ozs7UUFLcEIsTUFBTSxlQUFlO1VBQ25CLE9BQU87OztRQUdULE1BQU0sYUFBYSxTQUFTLFNBQVM7VUFDbkMsT0FBTyxlQUFlLE9BQU8sUUFBUSxpQkFBaUIsUUFBUTs7O1VBRzlELFFBQVEsVUFBVSxRQUFRLElBQUk7OztVQUc5QixRQUFRLE9BQU8sUUFBUTs7VUFFdkI7Ozs7O0FBS1Y7OztBQzVDQTs7Ozs7Ozs7Ozs7O0FBWUEsUUFBUSxPQUFPO0dBQ1osT0FBTyxpQkFBVyxTQUFTLEdBQUc7SUFDN0IsT0FBTyxTQUFTLEtBQUssY0FBYztNQUNqQyxPQUFPLEVBQUUsT0FBTyxLQUFLO1FBQ25CLE9BQU87Ozs7Ozs7Ozs7O0FBV2YsUUFBUSxPQUFPO0dBQ1osVUFBVSx3Q0FBdUIsVUFBVSxTQUFTLEdBQUc7SUFDdEQsT0FBTztNQUNMLGFBQWE7TUFDYixVQUFVO01BQ1YsU0FBUztNQUNULFNBQVM7TUFDVCxPQUFPO01BQ1AsTUFBTSxTQUFTLFNBQVMsT0FBTyxTQUFTLE9BQU8saUJBQWlCOzs7UUFHOUQsU0FBUyxhQUFhO1VBQ3BCLElBQUksaUJBQWlCO1lBQ25CLGdCQUFnQjs7Ozs7UUFLcEIsTUFBTSxVQUFVOztRQUVoQixNQUFNLFdBQVcsRUFBRSxPQUFPLFFBQVEsVUFBVSxTQUFTLFNBQVM7VUFDNUQsT0FBTyxRQUFRLFVBQVU7OztRQUczQixNQUFNLGFBQWEsRUFBRSxPQUFPLFFBQVEsVUFBVTtVQUM1QyxPQUFPOzs7UUFHVCxJQUFJLGlCQUFpQixNQUFNLE9BQU8sV0FBVztVQUMzQyxPQUFPLFFBQVEsU0FBUztXQUN2QixXQUFXO1VBQ1osTUFBTSxXQUFXLEVBQUUsT0FBTyxRQUFRLFVBQVUsU0FBUyxTQUFTO1lBQzVELE9BQU8sUUFBUSxVQUFVOzs7O1FBSTdCLE1BQU0sZ0JBQWdCLFNBQVMsU0FBUzs7VUFFdEMsUUFBUSxPQUFPO1VBQ2Y7OztRQUdGLE1BQU0sSUFBSSxZQUFZLFdBQVc7O1VBRS9COzs7OztBQUtWOzs7QUM1RUE7O0FBRUEsUUFBUSxPQUFPO0dBQ1osUUFBUSxpR0FBVyxTQUFTLE9BQU8sSUFBSSxRQUFRLEdBQUcsTUFBTSxJQUFJLEtBQUssWUFBWSxRQUFRLFFBQVE7SUFDNUYsSUFBSSxVQUFVOzs7SUFHZCxJQUFJLFdBQVc7O0lBRWYsUUFBUSxXQUFXO0lBQ25CLFFBQVEsVUFBVSxTQUFTO0lBQzNCLFFBQVEsaUJBQWlCO0lBQ3pCLFFBQVEsYUFBYTtJQUNyQixRQUFRLFFBQVE7SUFDaEIsUUFBUSxPQUFPOztJQUVmLElBQUksWUFBWTtNQUNkLFNBQVM7TUFDVCxTQUFTO01BQ1QsWUFBWTtNQUNaLFVBQVU7TUFDVixjQUFjOzs7SUFHaEIsUUFBUSxlQUFlOztJQUV2QixRQUFRLGFBQWEsT0FBTyxTQUFTLFVBQVU7TUFDN0MsSUFBSSxTQUFTLFlBQVksU0FBUyxPQUFPO01BQ3pDLE9BQU8sVUFBVSxTQUFTOzs7SUFHNUIsUUFBUSxhQUFhLGVBQWUsU0FBUyxVQUFVO01BQ3JELE9BQU8sUUFBUSxhQUFhLEtBQUssWUFBWTtTQUMxQyxTQUFTLGNBQWMsVUFBVSxNQUFNLFNBQVMsTUFBTTs7OztJQUkzRCxRQUFRLGFBQWEsV0FBVyxXQUFXO01BQ3pDLE9BQU87OztJQUdULFFBQVEsYUFBYSxRQUFRLFNBQVMsVUFBVTtNQUM5QyxPQUFPLFNBQVM7OztJQUdsQixRQUFRLGFBQWEsUUFBUSxhQUFhOzs7SUFHMUMsUUFBUSxXQUFXOztJQUVuQixRQUFRLFNBQVMsU0FBUyxTQUFTO01BQ2pDLElBQUk7O01BRUosT0FBTyxlQUFlLE9BQU8sUUFBUSxnQkFBZ0IsUUFBUTs7TUFFN0QsSUFBSSxRQUFRLFFBQVE7UUFDbEIsZ0JBQWdCLEdBQUcsU0FBUyxTQUFTLFFBQVE7O1VBRTNDLFFBQVEsT0FBTztVQUNmLGVBQWUsU0FBUyxRQUFRO1VBQ2hDOzthQUVHO1FBQ0wsZ0JBQWdCLE1BQU0sSUFBSSxRQUFRLEtBQUssQ0FBQyxPQUFPLE9BQU8sS0FBSyxTQUFTLFVBQVU7VUFDNUUsSUFBSTs7O1VBR0osSUFBSSxFQUFFLFNBQVMsU0FBUyxPQUFPO2FBQzVCLE9BQU8sU0FBUzthQUNoQixRQUFRLE9BQU87aUJBQ1g7WUFDTCxPQUFPLEtBQUssS0FBSyxTQUFTLE1BQU0sQ0FBQyxNQUFNO1lBQ3ZDLFFBQVEsT0FBTzs7O1VBR2pCLGVBQWUsU0FBUzs7OztNQUk1QixRQUFRLFNBQVMsUUFBUSxTQUFTLFVBQVU7UUFDMUMsZ0JBQWdCLGNBQWMsS0FBSzs7OztNQUlyQyxjQUFjLEtBQUssV0FBVztRQUM1QixPQUFPLGNBQWMsU0FBUyxRQUFROzs7TUFHeEMsT0FBTzs7O0lBR1QsU0FBUyxhQUFhLFFBQVEsT0FBTztNQUNuQyxJQUFJLFlBQVksT0FBTyxTQUFTLElBQUksU0FBUyxPQUFPO1FBQ2xELE9BQU87VUFDTCxPQUFPO1VBQ1AsTUFBTSxPQUFPLEtBQUs7VUFDbEIsZUFBZSxPQUFPLGNBQWM7Ozs7TUFJeEMsWUFBWSxLQUFLLFdBQVcsV0FBVyxTQUFTLFFBQVEsYUFBYSxjQUFjLFFBQVEsYUFBYTs7TUFFeEcsVUFBVSxLQUFLLEVBQUUsT0FBTyxLQUFLLFdBQVcsR0FBRyxVQUFVLFlBQVksT0FBTyxNQUFNLEdBQUcsS0FBSztNQUN0RixPQUFPOzs7O0lBSVQsU0FBUyxlQUFlLFNBQVMsTUFBTTtNQUNyQyxRQUFRLE9BQU87TUFDZixRQUFRLGlCQUFpQjs7TUFFekIsUUFBUSxTQUFTLElBQUksT0FBTyxPQUFPLE1BQU07Ozs7TUFJekMsUUFBUSxhQUFhLGFBQWEsUUFBUTs7O0lBRzVDLFFBQVEsTUFBTSxTQUFTLFNBQVM7TUFDOUIsSUFBSSxDQUFDLFFBQVEsSUFBSTtRQUNmLFFBQVEsS0FBSyxRQUFROztNQUV2QixTQUFTLEtBQUs7O01BRWQsT0FBTzs7O0lBR1QsT0FBTzs7QUFFWDs7O0FDaklBOzs7Ozs7OztBQVFBLFFBQVEsT0FBTztHQUNaLFVBQVUsZ0JBQWdCLFlBQVk7SUFDckMsT0FBTztNQUNMLGFBQWE7TUFDYixVQUFVO01BQ1YsT0FBTzs7O0FBR2I7OztBQ2hCQTs7QUFFQSxRQUFRLE9BQU87R0FDWixVQUFVLHdDQUFtQixTQUFTLFFBQVEsUUFBUTtJQUNyRCxPQUFPO01BQ0wsYUFBYTtNQUNiLFVBQVU7TUFDVixTQUFTO01BQ1QsT0FBTztNQUNQLE1BQU0sU0FBUyxTQUFTLDJCQUEyQjtRQUNqRCxNQUFNLGNBQWMsV0FBVztVQUM3QixPQUFPLGVBQWUsT0FBTyxRQUFRO1VBQ3JDLE9BQU8sS0FBSzs7Ozs7QUFLdEI7OztBQ2pCQTs7Ozs7Ozs7QUFRQSxRQUFRLE9BQU87O0dBRVosU0FBUyxjQUFjLE9BQU87R0FDOUIsVUFBVSxtREFBZ0IsVUFBVSxRQUFRLFFBQVEsWUFBWTs7OztJQUkvRCxTQUFTLFlBQVksTUFBTSxTQUFTOzs7OztNQUtsQyxPQUFPLENBQUMsYUFBYSxPQUFPLE9BQU8sT0FBTyxDQUFDOzs7SUFHN0MsU0FBUyxZQUFZLE1BQU0sZ0JBQWdCOzs7TUFHekMsT0FBTyxDQUFDLG9CQUFvQixlQUFlLFFBQVEsUUFBUSxDQUFDOzs7SUFHOUQsT0FBTztNQUNMLGFBQWE7TUFDYixTQUFTO01BQ1QsVUFBVTs7TUFFVixZQUFZO01BQ1osT0FBTztRQUNMLGFBQWE7UUFDYixnQkFBZ0I7OztRQUdoQixTQUFTOztNQUVYLE1BQU0sVUFBVSxPQUFPLG9CQUFvQjtRQUN6QyxNQUFNLFVBQVUsTUFBTSxXQUFXOztRQUVqQyxRQUFRLEdBQUcsc0JBQXNCLFNBQVMsWUFBWSxPQUFPO1VBQzNELElBQUksT0FBTztZQUNULE1BQU07O1VBRVIsTUFBTSxjQUFjLGFBQWEsZ0JBQWdCOzs7UUFHbkQsU0FBUyxTQUFTLE1BQU07VUFDdEIsSUFBSSxDQUFDLFlBQVksS0FBSyxNQUFNLE1BQU0saUJBQWlCO1lBQ2pELE1BQU0sT0FBTyxXQUFXO2NBQ3RCLE9BQU8sSUFBSSw2REFBNkQsTUFBTTs7WUFFaEY7O1VBRUYsSUFBSSxDQUFDLFlBQVksS0FBSyxNQUFNLE1BQU0sY0FBYztZQUM5QyxNQUFNLE9BQU8sV0FBVztjQUN0QixPQUFPLElBQUksK0JBQStCLE1BQU0sY0FBYzs7WUFFaEU7O1VBRUYsSUFBSSxTQUFTLElBQUk7O1VBRWpCLE9BQU8sU0FBUyxTQUFTLEtBQUs7WUFDNUIsT0FBTyxNQUFNLE9BQU8sU0FBUyxPQUFPO2NBQ2xDLE1BQU0sUUFBUSxPQUFPLElBQUksT0FBTzs7Y0FFaEMsTUFBTSxRQUFRLE9BQU8sS0FBSyxLQUFLLFFBQVEsVUFBVTs7OztVQUlyRCxPQUFPLFVBQVUsV0FBVztZQUMxQixPQUFPLElBQUk7OztVQUdiLE9BQU8sV0FBVzs7O1FBR3BCLFFBQVEsR0FBRyxRQUFRLFNBQVMsT0FBTyxPQUFPO1VBQ3hDLElBQUksT0FBTztZQUNULE1BQU07OztVQUdSLFNBQVMsTUFBTSxjQUFjLGFBQWEsTUFBTTs7O1FBR2xELFFBQVEsS0FBSyxzQkFBc0IsR0FBRyxVQUFVLFNBQVMsb0JBQW9COztVQUUzRSxTQUFTLEtBQUssTUFBTTs7Ozs7O0FBTTlCOzs7QUNsR0E7Ozs7Ozs7O0FBUUEsUUFBUSxPQUFPO0dBQ1osVUFBVSwyREFBZ0IsVUFBVSxTQUFTLFFBQVEsUUFBUSxHQUFHLElBQUk7SUFDbkUsT0FBTztNQUNMLGFBQWE7TUFDYixVQUFVO01BQ1YsU0FBUztNQUNULFNBQVM7TUFDVCxPQUFPO01BQ1AsTUFBTSxTQUFTLFNBQVMsT0FBTyxTQUFTLE9BQU8saUJBQWlCOzs7UUFHOUQsU0FBUyxhQUFhO1VBQ3BCLElBQUksaUJBQWlCO1lBQ25CLGdCQUFnQjs7Ozs7UUFLcEIsTUFBTSxVQUFVO1VBQ2QsTUFBTTtVQUNOLE1BQU07OztRQUdSLE1BQU0sYUFBYSxXQUFXO1VBQzVCLElBQUksT0FBTyxHQUFHLEtBQUssS0FBSyxNQUFNLFFBQVEsTUFBTTtZQUMxQyxNQUFNOzs7VUFHUixJQUFJLGdCQUFnQjtZQUNsQixJQUFJLEtBQUs7WUFDVCxNQUFNLE1BQU0sUUFBUTtZQUNwQixRQUFRO1lBQ1IsT0FBTzs7OztVQUlULE9BQU8sZUFBZSxPQUFPLFFBQVEsbUJBQW1CLGNBQWM7OztVQUd0RSxRQUFRLFVBQVUsUUFBUSxJQUFJOzs7VUFHOUIsUUFBUSxPQUFPLFFBQVE7OztVQUd2Qjs7Ozs7QUFLVjs7O0FDMURBOztBQUVBLFFBQVEsT0FBTyxRQUFRLFNBQVMsY0FBYyxDQUFDO0VBQzdDLE1BQU07RUFDTixhQUFhO0VBQ2IsS0FBSztFQUNMLElBQUk7RUFDSixPQUFPO0VBQ1A7RUFDQSxNQUFNO0VBQ04sYUFBYTtFQUNiLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTzs7QUFFVDs7O0FDNURBOztBQUVBLFFBQVEsT0FBTztHQUNaLFVBQVUsNEJBQWlCLFNBQVMsUUFBUTtJQUMzQyxPQUFPO01BQ0wsYUFBYTtNQUNiLFVBQVU7TUFDVixPQUFPO01BQ1AsTUFBTSxTQUFTLDRCQUE0QjtRQUN6QyxNQUFNLFNBQVM7Ozs7QUFJdkI7OztBQ2JBOzs7Ozs7OztBQVFBLFFBQVEsT0FBTztHQUNaLFVBQVUsd0NBQWdCLFVBQVUsV0FBVyxRQUFRO0lBQ3RELE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLFNBQVM7TUFDVCxPQUFPO1FBQ0wsYUFBYTs7TUFFZixNQUFNLFNBQVMsU0FBUyw0QkFBNEI7UUFDbEQsTUFBTSxZQUFZO1FBQ2xCLE1BQU0sU0FBUzs7OztBQUl2Qjs7O0FDdkJBOztBQUVBLFFBQVEsT0FBTztHQUNaLFVBQVUsMEZBQWdCLFNBQVMsS0FBSyxTQUFTLE9BQU8sR0FBRyxNQUFNLFFBQVEsSUFBSSxLQUFLLFFBQVE7SUFDekYsT0FBTztNQUNMLGFBQWE7TUFDYixVQUFVO01BQ1YsU0FBUztNQUNULE9BQU87UUFDTCxXQUFXO1FBQ1gsVUFBVTtRQUNWLE1BQU07UUFDTixTQUFTO1FBQ1QsVUFBVTs7TUFFWixNQUFNLFNBQVMsT0FBTyxxQkFBcUI7UUFDekMsSUFBSTs7OztRQUlKLE1BQU0saUJBQWlCO1VBQ3JCLGNBQWMsQ0FBQyxHQUFHLEtBQUssY0FBYyxHQUFHLEtBQUssU0FBUyxHQUFHLEtBQUs7VUFDOUQsU0FBUyxDQUFDLEdBQUcsS0FBSyxTQUFTLEdBQUcsS0FBSztVQUNuQyxTQUFTLENBQUMsR0FBRyxLQUFLLFNBQVMsR0FBRyxLQUFLO1VBQ25DLFVBQVUsQ0FBQyxHQUFHLEtBQUssVUFBVSxHQUFHLEtBQUssU0FBUyxHQUFHLEtBQUs7OztRQUd4RCxNQUFNLFVBQVU7UUFDaEIsTUFBTSxTQUFTLE9BQU8saUJBQWlCLE1BQU07UUFDN0MsTUFBTSxRQUFRLE1BQU07O1FBRXBCLE1BQU0sZ0JBQWdCLFVBQVUsV0FBVztVQUN6QyxJQUFJLGNBQWMsTUFBTSxlQUFlO1VBQ3ZDLE9BQU8sWUFBWSxNQUFNLFNBQVMsV0FBVztZQUMzQyxZQUFZLE1BQU07Ozs7UUFJdEIsTUFBTSxlQUFlO1FBQ3JCLE1BQU0sYUFBYTs7UUFFbkIsTUFBTSxjQUFjLFNBQVMsV0FBVyxNQUFNO1VBQzVDLElBQUksTUFBTSxhQUFhLFlBQVk7WUFDakMsT0FBTzs7VUFFVCxJQUFJLFNBQVMsS0FBSztZQUNoQixPQUFPOztVQUVULE9BQU8sR0FBRyxRQUFRLFlBQVksV0FBVzs7O1FBRzNDLGFBQWEsSUFBSSxLQUFLO1VBQ3BCLFNBQVMsUUFBUSxLQUFLLHFCQUFxQjtVQUMzQyxRQUFRLFFBQVEsS0FBSyxnQkFBZ0I7VUFDckMsVUFBVTtVQUNWLFFBQVE7OztRQUdWLE1BQU0seUJBQXlCLFFBQVEsS0FBSyxvQkFBb0I7O1FBRWhFLE1BQU0sY0FBYyxXQUFXO1VBQzdCLE1BQU0sT0FBTyxNQUFNOzs7UUFHckIsTUFBTSxpQkFBaUIsV0FBVztVQUNoQyxNQUFNLFVBQVUsTUFBTSxJQUFJLE1BQU0sWUFBWSxNQUFNOzs7UUFHcEQsTUFBTSxnQkFBZ0IsV0FBVztVQUMvQixNQUFNOzs7Ozs7UUFNUixNQUFNLGVBQWUsV0FBVztVQUM5QixJQUFJLE9BQU8sTUFBTSxJQUFJLE1BQU07OztVQUczQixJQUFJLFFBQVEsT0FBTyxPQUFPLFlBQVksS0FBSztVQUMzQyxJQUFJLENBQUMsRUFBRSxTQUFTLE9BQU8sS0FBSyxTQUFTLENBQUMsSUFBSSxTQUFTLFdBQVcsS0FBSyxPQUFPOztZQUV4RSxLQUFLLE9BQU8sTUFBTTs7Ozs7VUFLcEIsTUFBTSxTQUFTLE1BQU07VUFDckIsT0FBTyxlQUFlLE9BQU8sUUFBUSxZQUFZOzs7UUFHbkQsSUFBSSxtQkFBbUIsTUFBTSxPQUFPLGFBQWEsU0FBUyxXQUFXO1VBQ25FLE1BQU0sZUFBZSxNQUFNLGFBQWE7V0FDdkM7Ozs7UUFJSCxJQUFJLHlCQUF5QixNQUFNLE9BQU8sdUJBQXVCLFNBQVMsVUFBVTs7VUFFbEYsSUFBSSxNQUFNLFNBQVM7WUFDakIsTUFBTSxvQkFBb0IsTUFBTSxrQkFBa0IsTUFBTTtZQUN4RCxNQUFNLHNCQUFzQixNQUFNLG9CQUFvQixNQUFNO2lCQUN2RDtZQUNMLE1BQU0sSUFBSSxNQUFNLFdBQVcsV0FBVyxFQUFFLFVBQVUsWUFBWTtZQUM5RCxNQUFNLGFBQWEsSUFBSSxTQUFTLFdBQVcsU0FBUzs7V0FFckQ7O1FBRUgsTUFBTSxZQUFZLENBQUMsa0VBQWtFLGdDQUFnQyxTQUFTLElBQUk7VUFDaEksSUFBSSxlQUFlLElBQUksSUFBSSxVQUFVLElBQUk7VUFDekMsTUFBTSxlQUFlLGNBQWMsVUFBVSxDQUFDLEdBQUcsS0FBSyxnQkFBZ0I7OztRQUd4RSxNQUFNLElBQUksWUFBWSxXQUFXO1VBQy9CLElBQUksY0FBYyxXQUFXLFNBQVM7WUFDcEMsV0FBVzs7OztVQUliO1VBQ0E7Ozs7O0FBS1Y7OztBQzdIQTs7Ozs7Ozs7QUFRQSxRQUFRLE9BQU87R0FDWixVQUFVLDBDQUFhLFVBQVUsS0FBSyxNQUFNLElBQUksS0FBSztJQUNwRCxPQUFPO01BQ0wsYUFBYTtNQUNiLFVBQVU7TUFDVixTQUFTO01BQ1QsT0FBTztRQUNMLFVBQVU7UUFDVixTQUFTO1FBQ1QsV0FBVztRQUNYLFlBQVk7UUFDWixVQUFVO1FBQ1YsY0FBYzs7UUFFZCxRQUFRO1FBQ1IsV0FBVztRQUNYLGNBQWM7UUFDZCxtQkFBbUI7O01BRXJCLE1BQU0sU0FBUyxPQUFPLFNBQVM7UUFDN0IsSUFBSTtRQUNKLE1BQU0sU0FBUyxHQUFHO1FBQ2xCLE1BQU0sYUFBYSxJQUFJLFNBQVM7OztRQUdoQyxNQUFNLFdBQVc7UUFDakIsTUFBTSxPQUFPO1FBQ2IsTUFBTSxPQUFPOztRQUViLE1BQU0sVUFBVSxTQUFTLE9BQU87VUFDOUIsR0FBRyxNQUFNLFVBQVUsT0FBTyxXQUFXLFFBQVEsS0FBSyxrQkFBa0I7WUFDbEUsT0FBTyxXQUFXLFFBQVEsS0FBSyxhQUFhLElBQUk7WUFDaEQsTUFBTSxPQUFPOzs7O1FBSWpCLE1BQU0sT0FBTyxTQUFTLFVBQVU7VUFDOUIsT0FBTyxTQUFTLGFBQWEsU0FBUzthQUNuQyxTQUFTLE9BQU87WUFDakIsU0FBUyxjQUFjLFNBQVM7YUFDL0IsU0FBUyxRQUFRLFdBQVcsU0FBUyxRQUFROzs7UUFHbEQsSUFBSSxzQkFBc0IsTUFBTSxPQUFPLGdCQUFnQixTQUFTLGNBQWM7VUFDNUUsSUFBSSxDQUFDLGNBQWMsRUFBRTs7VUFFckIsSUFBSSxZQUFZO1lBQ2QsV0FBVzs7O1VBR2IsYUFBYSxJQUFJLEtBQUs7WUFDcEIsU0FBUztZQUNULFFBQVEsUUFBUSxLQUFLLGVBQWU7WUFDcEMsVUFBVTtZQUNWLFFBQVE7Ozs7UUFJWixJQUFJLGFBQWE7VUFDZixTQUFTO1VBQ1QsU0FBUztVQUNULGNBQWM7VUFDZCxVQUFVO1VBQ1YsWUFBWTs7O1FBR2QsSUFBSSxhQUFhO1VBQ2YsU0FBUztVQUNULFNBQVM7VUFDVCxjQUFjO1VBQ2QsVUFBVTs7UUFFWixXQUFXLE9BQU87O1FBRWxCLFNBQVMsaUJBQWlCLE1BQU0sTUFBTTtVQUNwQyxJQUFJLElBQUksU0FBUyxXQUFXLE9BQU87WUFDakMsSUFBSSxNQUFNO1lBQ1YsS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLEtBQUssS0FBSyxRQUFRLEtBQUs7Y0FDekMsSUFBSSxRQUFRLEtBQUssS0FBSztjQUN0QixJQUFJLFFBQVEsTUFBTTtnQkFDaEIsTUFBTSxLQUFLO3FCQUNOO2dCQUNMLElBQUksUUFBUSxLQUFLLFFBQVE7a0JBQ3ZCLE9BQU87Ozs7WUFJYixPQUFPOztVQUVULE9BQU8sS0FBSzs7O1FBR2QsSUFBSSxrQkFBa0IsTUFBTSxPQUFPLFlBQVksU0FBUyxVQUFVO1VBQ2hFLE1BQU0sT0FBTyxpQkFBaUIsU0FBUyxNQUFNO1VBQzdDLE1BQU0sV0FBVyxpQkFBaUIsU0FBUyxNQUFNOzs7UUFHbkQsTUFBTSxJQUFJLFlBQVksV0FBVztVQUMvQixJQUFJLGNBQWMsV0FBVyxTQUFTO1lBQ3BDLFdBQVc7Ozs7VUFJYjtVQUNBOzs7OztBQUtWOzs7QUNySEE7O0FBRUEsUUFBUSxPQUFPO0dBQ1osVUFBVSxzRUFBa0IsU0FBUyxHQUFHLFFBQVEsSUFBSSxPQUFPLFFBQVEsU0FBUztJQUMzRSxPQUFPO01BQ0wsYUFBYTtNQUNiLFVBQVU7TUFDVixPQUFPO1FBQ0wsV0FBVztRQUNYLFVBQVU7O01BRVosTUFBTSxTQUFTLDJCQUEyQjtRQUN4QyxJQUFJLElBQUksT0FBTyxNQUFNLFNBQVM7O1FBRTlCLE1BQU0sT0FBTztVQUNYLFVBQVU7VUFDVixNQUFNO1lBQ0osV0FBVztZQUNYLFdBQVc7O1VBRWIsWUFBWTtVQUNaLFNBQVM7Ozs7UUFJWCxJQUFJLG9CQUFvQjtVQUN0QixXQUFXO1lBQ1QsV0FBVztZQUNYLFdBQVc7WUFDWCxPQUFPO1lBQ1AsU0FBUztZQUNULFdBQVc7WUFDWDs7VUFFRixXQUFXO1lBQ1Q7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBOzs7O1FBSUosSUFBSSxvQkFBb0IsU0FBUyxVQUFVOztVQUV6QyxJQUFJLFFBQVEsTUFBTSxJQUFJLE1BQU07VUFDNUIsSUFBSSxDQUFDLE1BQU07WUFDVCxPQUFPOztVQUVULElBQUksUUFBUSxLQUFLOztVQUVqQixJQUFJLFVBQVUsTUFBTSxhQUFhLE1BQU0sYUFBYSxNQUFNLE1BQU07VUFDaEUsT0FBTyxDQUFDOztZQUVOLFFBQVEsT0FBTyxxQkFBcUIsQ0FBQyxPQUFPLE9BQU8sU0FBUyxTQUFTLFVBQVU7Ozs7UUFJbkYsSUFBSSxZQUFZLEVBQUUsS0FBSyxFQUFFLE9BQU8sa0JBQWtCLFdBQVcsa0JBQWtCLFlBQVk7OztRQUczRixJQUFJLHdCQUF3QjtVQUMxQixXQUFXO1lBQ1QsV0FBVztZQUNYLE9BQU87WUFDUCxRQUFRO1lBQ1I7O1VBRUYsV0FBVztZQUNULFNBQVM7WUFDVCxZQUFZO1lBQ1osTUFBTTtZQUNOLFNBQVM7WUFDVCxZQUFZOzs7OztRQUtoQixJQUFJLGFBQWEsRUFBRSxLQUFLLEVBQUUsT0FBTyxzQkFBc0IsV0FBVyxzQkFBc0IsV0FBVyxDQUFDO1VBQ2xHLEtBQUs7O1FBRVAsTUFBTSxnQkFBZ0IsV0FBVztVQUMvQixPQUFPLGVBQWUsT0FBTyxRQUFRLGFBQWEsTUFBTSxLQUFLOztVQUU3RCxJQUFJLGVBQWUsTUFBTSxLQUFLOztVQUU5QixJQUFJLFVBQVUsTUFBTSxJQUFJLE1BQU07WUFDNUIsT0FBTyxFQUFFLE1BQU07WUFDZixPQUFPLE9BQU8sS0FBSyxPQUFPO1lBQzFCLE1BQU0sU0FBUyxHQUFHLEtBQUs7WUFDdkIsTUFBTSxTQUFTLEdBQUcsS0FBSzs7VUFFekIsR0FBRyxDQUFDLEtBQUs7WUFDUDs7Ozs7VUFLRixLQUFLLE1BQU0saUJBQWlCLE1BQU0sS0FBSztVQUN2QyxLQUFLLFlBQVksQ0FBQyxPQUFPLFdBQVcsUUFBUSxrQkFBa0IsQ0FBQyxLQUFLLGVBQWU7VUFDbkYsS0FBSyxXQUFXLENBQUMsT0FBTyxVQUFVLFFBQVEsa0JBQWtCLENBQUMsS0FBSyxlQUFlOztVQUVqRixHQUFHLENBQUMsRUFBRSxRQUFRLFNBQVMsTUFBTTtZQUMzQixNQUFNLElBQUksTUFBTSxXQUFXLE1BQU07Ozs7O1FBS3JDLElBQUksa0JBQWtCLE1BQU0sT0FBTyxZQUFZLFNBQVMsTUFBTTtVQUM1RCxJQUFJLENBQUMsTUFBTTtZQUNUOzs7VUFHRixJQUFJLE9BQU8sS0FBSyxRQUFRLEtBQUssT0FBTzs7O1VBR3BDLElBQUksS0FBSyxLQUFLO1lBQ1osVUFBVSxLQUFLLElBQUk7OztVQUdyQixJQUFJLGlCQUFpQixDQUFDLE1BQU0sU0FBUyxTQUFTLFFBQVEsTUFBTSxlQUFlLENBQUM7WUFDMUUsTUFBTSxTQUFTLEdBQUcsS0FBSztZQUN2QixNQUFNLFNBQVMsR0FBRyxLQUFLOzs7VUFHekIsTUFBTSxLQUFLLGFBQWE7OztVQUd4QixNQUFNLEtBQUssVUFBVSxLQUFLLFVBQVU7O1VBRXBDLEdBQUcsS0FBSyxVQUFVLE9BQU8sS0FBSyxjQUFjLE1BQU07WUFDaEQsTUFBTSxLQUFLLEtBQUssVUFBVSxDQUFDO1lBQzNCLE1BQU0sS0FBSyxLQUFLLFVBQVU7WUFDMUIsTUFBTSxLQUFLLFdBQVc7aUJBQ2pCOztZQUVMLElBQUksS0FBSztjQUNQLE1BQU0sS0FBSyxLQUFLLFlBQVksa0JBQWtCLFVBQVUsT0FBTztjQUMvRCxNQUFNLEtBQUssS0FBSyxZQUFZLGtCQUFrQixVQUFVLE9BQU87O2lCQUU1RCxJQUFJLEtBQUs7Y0FDWixNQUFNLEtBQUssS0FBSyxZQUFZLHNCQUFzQjtjQUNsRCxNQUFNLEtBQUssS0FBSyxZQUFZLHNCQUFzQjs7O1lBR3BELElBQUksYUFBYSxDQUFDO2VBQ2YsT0FBTyxTQUFTLE9BQU8sT0FBTztpQkFDNUI7O1lBRUwsSUFBSSxXQUFXLEtBQUssTUFBTTtjQUN4QixLQUFLLGFBQWEsS0FBSzs7WUFFekIsSUFBSSxNQUFNLEtBQUssS0FBSyxVQUFVLFFBQVEsYUFBYSxLQUFLLE1BQU0sS0FBSyxLQUFLLFVBQVUsUUFBUSxhQUFhLEdBQUc7Y0FDeEcsTUFBTSxLQUFLLFdBQVc7bUJBQ2pCO2NBQ0wsTUFBTSxLQUFLLFdBQVc7OztXQUd6Qjs7UUFFSCxNQUFNLElBQUksWUFBWSxXQUFXOztVQUUvQjs7Ozs7QUFLVjs7O0FDM0tBOzs7Ozs7OztBQVFBLFFBQVEsT0FBTztHQUNaLFVBQVUsaUNBQVMsVUFBVSxXQUFXLFFBQVE7SUFDL0MsT0FBTztNQUNMLGFBQWE7TUFDYixVQUFVO01BQ1YsWUFBWTtNQUNaLE9BQU87UUFDTCxVQUFVO1FBQ1YsVUFBVTs7O01BR1osdUJBQVksU0FBUyxRQUFRO1FBQzNCLEtBQUssUUFBUSxXQUFXO1VBQ3RCLE9BQU8sU0FBUzs7O01BR3BCLE1BQU0sU0FBUyxPQUFPLFNBQVMsT0FBTztRQUNwQyxJQUFJLFVBQVUsTUFBTTs7UUFFcEIsSUFBSSxNQUFNLFVBQVU7VUFDbEIsTUFBTSxlQUFlLGVBQWUsTUFBTTs7OztRQUk1QyxNQUFNLFNBQVMsTUFBTTs7O1FBR3JCLFNBQVMsT0FBTyxHQUFHO1VBQ2pCLElBQUksRUFBRSxZQUFZLE1BQU0sTUFBTSxRQUFRO1lBQ3BDLE1BQU0sU0FBUztZQUNmLE1BQU07Ozs7UUFJVixRQUFRLFFBQVEsV0FBVyxHQUFHLFdBQVc7OztRQUd6QyxPQUFPLFNBQVMsU0FBUztRQUN6QixNQUFNLElBQUksWUFBWSxXQUFXO1VBQy9CLE9BQU8sV0FBVzs7Ozs7QUFLNUI7OztBQ3BEQTs7Ozs7Ozs7QUFRQSxRQUFRLE9BQU87R0FDWixVQUFVLG9CQUFvQixXQUFXO0lBQ3hDLE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLFNBQVM7TUFDVCxPQUFPO1FBQ0wsYUFBYTs7TUFFZixNQUFNLFNBQVMsT0FBTyxTQUFTLE9BQU8saUJBQWlCO1FBQ3JELE1BQU0sYUFBYSxXQUFXO1VBQzVCLGdCQUFnQjtVQUNoQixJQUFJLE1BQU0sYUFBYTtZQUNyQixNQUFNOzs7Ozs7QUFNbEI7OztBQzNCQTs7Ozs7Ozs7O0FBU0EsUUFBUSxPQUFPO0dBQ1osUUFBUSw0QkFBVSxVQUFVLGVBQWU7Ozs7O0lBSzFDLElBQUksY0FBYyxjQUFjOzs7SUFHaEMsT0FBTztNQUNMLFVBQVUsU0FBUyxJQUFJLE9BQU87UUFDNUIsSUFBSSxZQUFZLElBQUksS0FBSztVQUN2QixRQUFRLE1BQU0sd0NBQXdDO1VBQ3REOztRQUVGLFlBQVksSUFBSSxJQUFJOzs7TUFHdEIsWUFBWSxTQUFTLElBQUk7UUFDdkIsWUFBWSxPQUFPOzs7O01BSXJCLE1BQU0sU0FBUyxJQUFJO1FBQ2pCLElBQUksYUFBYSxZQUFZLElBQUk7UUFDakMsSUFBSSxDQUFDLFlBQVk7VUFDZixRQUFRLE1BQU0sMkJBQTJCO1VBQ3pDOztRQUVGLFdBQVcsU0FBUzs7OztNQUl0QixPQUFPLFNBQVMsSUFBSTtRQUNsQixJQUFJLGFBQWEsWUFBWSxJQUFJO1FBQ2pDLElBQUksQ0FBQyxZQUFZO1VBQ2YsUUFBUSxNQUFNLDJCQUEyQjtVQUN6Qzs7UUFFRixXQUFXLFNBQVM7OztNQUd0QixPQUFPLFdBQVc7UUFDaEIsWUFBWTs7O01BR2QsT0FBTyxXQUFXO1FBQ2hCLE9BQU8sWUFBWSxPQUFPOzs7O0FBSWxDOzs7QUM1REE7Ozs7Ozs7O0FBUUEsUUFBUSxPQUFPO0dBQ1osVUFBVSxrQkFBa0IsWUFBWTtJQUN2QyxPQUFPO01BQ0wsYUFBYTtNQUNiLFVBQVU7TUFDVixPQUFPO1FBQ0wsSUFBSTtRQUNKLE1BQU07UUFDTixNQUFNO1FBQ04sVUFBVTtRQUNWLE9BQU87UUFDUCxhQUFhO1FBQ2IsU0FBUztRQUNULEtBQUs7UUFDTCxLQUFLO1FBQ0wsTUFBTTs7TUFFUixNQUFNLFNBQVMsU0FBUyw0QkFBNEI7UUFDbEQsTUFBTSxVQUFVLE1BQU0sWUFBWTs7O1FBR2xDLE1BQU0sWUFBWSxFQUFFLE9BQU87O1FBRTNCLElBQUksTUFBTSxTQUFTO1VBQ2pCLE1BQU0sVUFBVSxRQUFRLE1BQU0sTUFBTSxNQUFNLGNBQWM7OztVQUd4RCxJQUFJLG1CQUFtQixNQUFNLE9BQU8sbUJBQW1CLFdBQVc7WUFDaEUsSUFBSSxNQUFNLFVBQVUsVUFBVSxNQUFNO2NBQ2xDLE1BQU0sTUFBTSxNQUFNLFlBQVk7Ozs7VUFJbEMsTUFBTSxJQUFJLFlBQVksV0FBVzs7WUFFL0I7Ozs7O1FBS0osTUFBTSxVQUFVLE1BQU0sUUFBUSxhQUFhLE1BQU0sUUFBUTs7OztBQUlqRTs7O0FDcERBOztBQUVBLFFBQVEsT0FBTztHQUNaLFVBQVUsY0FBYyxXQUFXO0lBQ2xDLE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLE9BQU87UUFDTCxTQUFTO1FBQ1QsV0FBVztRQUNYLFNBQVM7O01BRVgsU0FBUzs7O0FBR2Y7OztBQ2ZBOzs7Ozs7OztBQVFBLFFBQVEsT0FBTztHQUNaLFVBQVUsbUNBQWtCLFVBQVUsT0FBTyxLQUFLO0lBQ2pELE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLFNBQVM7TUFDVCxPQUFPO1FBQ0wsVUFBVTtRQUNWLFVBQVU7O01BRVosTUFBTSxTQUFTLFNBQVMsT0FBTztRQUM3QixNQUFNLGFBQWEsSUFBSSxTQUFTOztRQUVoQyxNQUFNLFdBQVcsU0FBUyxVQUFVO1VBQ2xDLE1BQU0sSUFBSTs7O1FBR1osTUFBTSxpQkFBaUIsV0FBVztVQUNoQyxJQUFJLFdBQVcsTUFBTTs7VUFFckIsTUFBTSxPQUFPO1lBQ1gsT0FBTyxTQUFTO1lBQ2hCLE9BQU8sU0FBUztZQUNoQixNQUFNLFNBQVM7WUFDZixXQUFXLFNBQVM7O1VBRXRCLE1BQU0sVUFBVSxNQUFNLE1BQU07OztRQUc5QixNQUFNLGdCQUFnQixNQUFNOzs7TUFHL0I7Ozs7QUN4Q0w7O0FBRUEsUUFBUSxPQUFPO0dBQ1osVUFBVSxXQUFXLFdBQVc7O0lBRS9CLE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLE9BQU87UUFDTCxNQUFNO1FBQ04sU0FBUztRQUNULFlBQVk7O01BRWQsU0FBUztNQUNULG9GQUFZLFNBQVMsUUFBUSxLQUFLLE1BQU0sSUFBSSxRQUFRLFNBQVMsUUFBUSxPQUFPO1FBQzFFLE9BQU8sTUFBTTtRQUNiLE9BQU8sZ0JBQWdCOztRQUV2QixPQUFPLFFBQVEsQ0FBQyxTQUFTLFFBQVEsT0FBTyxRQUFRLFFBQVE7UUFDeEQsT0FBTyxlQUFlLENBQUMsS0FBSyxPQUFPLE9BQU87O1FBRTFDLE9BQU8sYUFBYSxXQUFXO1VBQzdCLE9BQU8sZUFBZSxPQUFPLFFBQVEsYUFBYSxPQUFPLEtBQUs7OztRQUdoRSxPQUFPLFlBQVksVUFBVTtVQUMzQixHQUFHLEtBQUssVUFBVSxPQUFPOzs7UUFHM0IsT0FBTyxRQUFRLFVBQVU7VUFDdkIsT0FBTyxlQUFlLE9BQU8sUUFBUSxZQUFZLE9BQU87VUFDeEQsTUFBTTs7O1FBR1IsSUFBSSxjQUFjLE9BQU8sT0FBTyxRQUFRLFNBQVMsTUFBTTs7VUFFckQsSUFBSSxPQUFPLFlBQVk7WUFDckIsT0FBTyxnQkFBZ0IsS0FBSyxLQUFLLEtBQUssVUFBVSxPQUFPLFNBQVMsZUFBZSxXQUFXO2NBQ3hGLElBQUksTUFBTSxhQUFhLFlBQVk7Z0JBQ2pDLGNBQWMsS0FBSzs7Y0FFckIsT0FBTztlQUNOOzs7VUFHTCxJQUFJLENBQUMsT0FBTyxTQUFTO1lBQ25CLE9BQU8sZUFBZSxPQUFPLFFBQVEsYUFBYTtZQUNsRCxNQUFNLE9BQU87O1dBRWQ7OztRQUdILE9BQU8sSUFBSSxZQUFZLFdBQVc7O1VBRWhDOzs7OztBQUtWOzs7QUMzREE7Ozs7Ozs7O0FBUUEsUUFBUSxPQUFPO0dBQ1osVUFBVSxPQUFPLFdBQVc7SUFDM0IsT0FBTztNQUNMLGFBQWE7TUFDYixVQUFVO01BQ1YsU0FBUztNQUNULFNBQVM7TUFDVCxZQUFZO01BQ1osT0FBTztRQUNMLFNBQVM7O01BRVgsTUFBTSxTQUFTLE9BQU8sU0FBUyxPQUFPLGtCQUFrQjtRQUN0RCxpQkFBaUIsT0FBTzs7OztBQUloQzs7O0FDeEJBOzs7Ozs7OztBQVFBLFFBQVEsT0FBTztHQUNaLFVBQVUsVUFBVSxXQUFXO0lBQzlCLE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLFlBQVk7OztNQUdaLFlBQVksV0FBVztRQUNyQixJQUFJLE9BQU87O1FBRVgsS0FBSyxPQUFPOztRQUVaLEtBQUssU0FBUyxTQUFTLFVBQVU7O1VBRS9CLFNBQVMsU0FBUyxLQUFLLEtBQUssV0FBVztVQUN2QyxLQUFLLEtBQUssS0FBSzs7O1FBR2pCLEtBQUssVUFBVSxTQUFTLGFBQWE7VUFDbkMsS0FBSyxLQUFLLFFBQVEsU0FBUyxLQUFLOztZQUU5QixJQUFJLFNBQVMsUUFBUTs7Ozs7O01BTTNCLGNBQWM7OztBQUdwQjs7O0FDdkNBOztBQUVBLFFBQVEsT0FBTztHQUNaLFVBQVUsOEhBQVUsU0FBUyxJQUFJLElBQUksS0FBSyxVQUFVLElBQUksU0FBUyxRQUFRLFFBQVEsR0FBRyxXQUFXLFFBQVEsTUFBTSxTQUFTO0lBQ3JILElBQUksVUFBVTtJQUNkLElBQUksa0JBQWtCLE1BQU0sR0FBRyxrQkFBa0IsVUFBVTs7SUFFM0QsSUFBSSxjQUFjLElBQUksS0FBSyxTQUFTLEdBQUcsRUFBRTtRQUNyQyxPQUFPLEVBQUUsV0FBVyxFQUFFOztNQUV4QixZQUFZOztJQUVkLFNBQVMsWUFBWSxPQUFPLFFBQVE7O01BRWxDLElBQUksUUFBUSxtQkFBbUIsU0FBUyxtQkFBbUIsTUFBTSxTQUFTLGlCQUFpQjtRQUN6RixPQUFPOztNQUVULE9BQU87OztJQUdULE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLE9BQU87UUFDTCxPQUFPOzs7UUFHUCxVQUFVOztRQUVWLFVBQVU7UUFDVixXQUFXOztRQUVYLGtCQUFrQjtRQUNsQixXQUFXO1FBQ1gsVUFBVTtRQUNWLFVBQVU7UUFDVixVQUFVO1FBQ1YsVUFBVTtRQUNWLFNBQVM7UUFDVCxXQUFXO1FBQ1gsU0FBUzs7TUFFWCxTQUFTO01BQ1QsTUFBTSxTQUFTLE9BQU8sU0FBUztRQUM3QixJQUFJLGdCQUFnQjtVQUNsQixrQkFBa0I7O1FBRXBCLElBQUk7O1FBRUosU0FBUyxjQUFjO1VBQ3JCLElBQUksTUFBTTtZQUNSLEtBQUssSUFBSTtZQUNULEtBQUssSUFBSTtZQUNULEtBQUs7WUFDTCxPQUFPOztZQUVQLElBQUksWUFBWTtZQUNoQixJQUFJLE9BQU8sU0FBUyxRQUFRLE9BQU87Y0FDakMsT0FBTyxRQUFRLE1BQU07Ozs7O1FBSzNCLE1BQU0sU0FBUzs7UUFFZixJQUFJLGVBQWU7UUFDbkIsSUFBSSxpQkFBaUI7UUFDckIsSUFBSSx5QkFBeUI7O1FBRTdCLE1BQU0sYUFBYTtRQUNuQixNQUFNLGdCQUFnQjtRQUN0QixNQUFNLFlBQVk7Ozs7UUFJbEIsSUFBSSxTQUFTLEdBQUcsS0FBSyxPQUFPLE9BQU87O1FBRW5DLE1BQU0sWUFBWSxXQUFXO1VBQzNCLGVBQWUsU0FBUyxVQUFVO1lBQ2hDLE9BQU8sZUFBZSxPQUFPLFFBQVEsaUJBQWlCLE1BQU0sTUFBTSxVQUFVO2NBQzFFLE1BQU0sTUFBTTs7WUFFZCxNQUFNLGFBQWEsQ0FBQyxNQUFNO2FBQ3pCOzs7UUFHTCxNQUFNLFdBQVcsV0FBVztVQUMxQixJQUFJLE1BQU0sWUFBWTtZQUNwQixPQUFPLGVBQWUsT0FBTyxRQUFRLGdCQUFnQixNQUFNLE1BQU0sV0FBVztjQUMxRSxNQUFNLE1BQU07Ozs7VUFJaEIsU0FBUyxPQUFPO1VBQ2hCLGVBQWU7O1VBRWYsTUFBTSxhQUFhLE1BQU0sV0FBVzs7O1FBR3RDLFNBQVMsZ0JBQWdCLE9BQU8sTUFBTTtVQUNwQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssT0FBTztZQUN4Qjs7O1VBR0YsaUJBQWlCLFNBQVMsU0FBUyxpQkFBaUI7OztZQUdsRCxJQUFJLEtBQUssTUFBTSxVQUFVO2NBQ3ZCOzs7WUFHRixNQUFNLGdCQUFnQjtZQUN0QixPQUFPLGVBQWUsT0FBTyxRQUFRLGVBQWUsS0FBSyxPQUFPO2NBQzlELFdBQVcsTUFBTSxNQUFNO2NBQ3ZCLE1BQU0sTUFBTTs7Ozs7WUFLZCxNQUFNLE9BQU8sRUFBRSxLQUFLLE9BQU8sS0FBSyxTQUFTO2VBQ3RDLFVBQVU7ZUFDVixJQUFJLFNBQVMsR0FBRztnQkFDZixFQUFFLEtBQUssR0FBRyxLQUFLLFNBQVMsRUFBRSxNQUFNLE9BQU8sRUFBRSxNQUFNLEVBQUU7Z0JBQ2pELE9BQU87O1lBRVgsTUFBTTs7WUFFTixJQUFJLFVBQVUsUUFBUSxLQUFLO2NBQ3pCLFFBQVEsUUFBUSxRQUFRO2NBQ3hCLFFBQVEsUUFBUTtjQUNoQixRQUFRLFFBQVE7OztZQUdsQixJQUFJLE1BQU0sTUFBTSxHQUFHLFNBQVMsTUFBTSxVQUFVO2NBQzFDLFFBQVEsSUFBSSxRQUFRLE1BQU0sTUFBTTttQkFDM0I7Y0FDTCxRQUFRLElBQUksUUFBUSxNQUFNLE1BQU0sR0FBRzs7OztZQUlyQyxJQUFJLE1BQU0sTUFBTSxJQUFJLFFBQVEsTUFBTSxTQUFTO2NBQ3pDLFFBQVEsSUFBSSxTQUFTLE1BQU0sTUFBTTttQkFDNUI7Y0FDTCxRQUFRLElBQUksU0FBUyxNQUFNLE1BQU0sR0FBRzs7YUFFckM7OztRQUdMLFNBQVMsZUFBZSxPQUFPLE1BQU07O1VBRW5DLElBQUksVUFBVSxRQUFRLEtBQUs7VUFDM0IsUUFBUSxJQUFJLE9BQU87VUFDbkIsUUFBUSxJQUFJLFFBQVE7VUFDcEIsU0FBUyxPQUFPO1VBQ2hCLGlCQUFpQjs7VUFFakIsSUFBSSxNQUFNLGVBQWU7WUFDdkIsT0FBTyxlQUFlLE9BQU8sUUFBUSxtQkFBbUIsS0FBSyxPQUFPO2NBQ2xFLFdBQVcsTUFBTSxNQUFNO2NBQ3ZCLE1BQU0sTUFBTTs7O1VBR2hCLE1BQU0sZ0JBQWdCO1VBQ3RCLE1BQU0sT0FBTztVQUNiLE1BQU07OztRQUdSLFNBQVMsWUFBWTtVQUNuQixJQUFJLFlBQVksTUFBTSxhQUFhLE9BQU8sb0JBQW9COztVQUU5RCxJQUFJLENBQUMsTUFBTSxNQUFNLFFBQVE7WUFDdkI7OztVQUdGLElBQUksU0FBUyxFQUFFLFVBQVUsTUFBTSxNQUFNO1VBQ3JDLEdBQUcsS0FBSyxPQUFPLE9BQU8sUUFBUSxPQUFPO1VBQ3JDLE9BQU8sR0FBRyxRQUFRLFFBQVE7OztRQUc1QixTQUFTLGdCQUFnQjtVQUN2QixPQUFPLFFBQVEsS0FBSzs7O1FBR3RCLFNBQVMsa0JBQWtCO1VBQ3pCLElBQUksYUFBYTtVQUNqQixJQUFJLE1BQU0sU0FBUzs7O1lBR2pCLE1BQU07O1lBRU4sSUFBSSxTQUFTLEtBQUs7Z0JBQ2Q7Z0JBQ0EsUUFBUTtnQkFDUixNQUFNOzs7WUFHVixJQUFJLFNBQVMsR0FBRztjQUNkLFdBQVcsTUFBTSxNQUFNLFFBQVE7eUJBQ3BCLE9BQU8sTUFBTSxTQUFTOzs7aUJBRzlCO1lBQ0wsV0FBVyxJQUFJLGFBQWE7dUJBQ2pCLElBQUksb0JBQW9COzs7O1FBSXZDLFNBQVMsZUFBZTtVQUN0QixPQUFPLE1BQU0sTUFBTSxjQUFjLE1BQU0sTUFBTSxTQUFTLElBQUksTUFBTSxVQUFVLE9BQU8sTUFBTSxNQUFNLFVBQVU7OztRQUd6RyxTQUFTLGtCQUFrQjs7VUFFekIsSUFBSSxZQUFZLFNBQVMsR0FBRztZQUMxQixJQUFJLE9BQU8sWUFBWTtZQUN2QixLQUFLO2lCQUNBOztZQUVMLFlBQVk7Ozs7O1FBS2hCLFNBQVMsT0FBTyxNQUFNOztVQUVwQixJQUFJLENBQUMsTUFBTTtZQUNULElBQUksTUFBTTtjQUNSOztZQUVGOzs7VUFHRixNQUFNLFNBQVMsS0FBSztVQUNwQixJQUFJLENBQUMsU0FBUztZQUNaLFFBQVEsTUFBTTs7O1VBR2hCLElBQUksWUFBWTs7VUFFaEIsU0FBUyxZQUFZOztZQUVuQixJQUFJLE1BQU0sYUFBYSxNQUFNLGFBQWEsTUFBTSxZQUFZLE1BQU0sTUFBTSxlQUFlLENBQUMsTUFBTSxTQUFTLE1BQU0sU0FBUztjQUNwSCxRQUFRLElBQUksb0JBQW9CO2NBQ2hDO2NBQ0E7OztZQUdGLElBQUksUUFBUSxJQUFJLE9BQU87O1lBRXZCLEdBQUcsTUFBTSxLQUFLLE1BQU0sU0FBUyxPQUFPLE9BQU87Y0FDekMsSUFBSSxPQUFPO2dCQUNULFFBQVEsTUFBTSxTQUFTO2dCQUN2Qix5QkFBeUIsU0FBUyxpQkFBaUI7Z0JBQ25EOztjQUVGLElBQUk7Z0JBQ0YsSUFBSSxXQUFXLElBQUksT0FBTztnQkFDMUI7Z0JBQ0EsT0FBTyxNQUFNLENBQUMsSUFBSSxRQUFROztnQkFFMUIsSUFBSSxDQUFDLE9BQU8sUUFBUTtrQkFDbEIsS0FBSyxLQUFLLENBQUMsS0FBSyxRQUFROzs7Z0JBRzFCLEtBQUs7O2dCQUVMLElBQUksU0FBUyxLQUFLLEtBQUssVUFBVSxTQUFTO2dCQUMxQyxJQUFJLFdBQVcsWUFBWSxPQUFPLE9BQU8sT0FBTztnQkFDaEQsSUFBSSxhQUFhLE9BQU87a0JBQ3RCLEtBQUssU0FBUzs7O2dCQUdoQixJQUFJLGFBQWEsUUFBUSxLQUFLOztnQkFFOUIsTUFBTSxTQUFTLFdBQVc7Z0JBQzFCLE1BQU0sU0FBUyxXQUFXOztnQkFFMUIsSUFBSSxPQUFPLE9BQU87a0JBQ2hCLFFBQVEsUUFBUSxRQUFRLFNBQVM7a0JBQ2pDLFFBQVEsTUFBTSxhQUFhOzs7Z0JBRzdCLE9BQU8sZUFBZSxPQUFPLFFBQVEsY0FBYyxNQUFNLE1BQU0sV0FBVztrQkFDeEUsTUFBTSxNQUFNOztnQkFFZDs7Z0JBRUEsSUFBSSxXQUFXLElBQUksT0FBTztnQkFDMUIsUUFBUSxJQUFJLGVBQWUsU0FBUyxRQUFRLGFBQWEsU0FBUyxXQUFXO2dCQUM3RSxJQUFJLE1BQU0sU0FBUztrQkFDakIsS0FBSyxHQUFHLGFBQWE7a0JBQ3JCLEtBQUssR0FBRyxZQUFZOztnQkFFdEIsT0FBTyxHQUFHO2dCQUNWLFFBQVEsTUFBTSxHQUFHLEtBQUssVUFBVTt3QkFDeEI7Z0JBQ1IseUJBQXlCLFNBQVMsaUJBQWlCOzs7Ozs7VUFNekQsSUFBSSxDQUFDLFdBQVc7WUFDZCxVQUFVO1lBQ1Y7aUJBQ0s7O1lBRUwsWUFBWSxLQUFLO2NBQ2YsVUFBVSxNQUFNLFlBQVk7Y0FDNUIsT0FBTzs7Ozs7UUFLYixJQUFJLGNBQWMsTUFBTSxPQUFPLFdBQVc7O1VBRXhDLE9BQU8sRUFBRSxLQUFLLE1BQU0sTUFBTSxRQUFRO1dBQ2pDLFdBQVc7VUFDWixJQUFJLE9BQU8sTUFBTSxNQUFNLFNBQVM7VUFDaEMsSUFBSSxDQUFDLE1BQU0sTUFBTSxXQUFXOztZQUUxQixNQUFNLE1BQU0sWUFBWSxNQUFNLE1BQU07O1VBRXRDLE9BQU87V0FDTjs7UUFFSCxNQUFNLElBQUksWUFBWSxXQUFXO1VBQy9CLFFBQVEsSUFBSTtVQUNaLElBQUksTUFBTTtZQUNSOzs7VUFHRixJQUFJLGNBQWM7WUFDaEIsU0FBUyxPQUFPO1lBQ2hCLGVBQWU7OztVQUdqQixJQUFJLGdCQUFnQjtZQUNsQixTQUFTLE9BQU87WUFDaEIsaUJBQWlCOzs7Ozs7OztVQVFuQixNQUFNLFlBQVk7Ozs7Ozs7VUFPbEI7Ozs7O0FBS1Y7OztBQ3ZXQTs7Ozs7Ozs7QUFRQSxRQUFRLE9BQU87R0FDWixVQUFVLDJHQUFlLFVBQVUsV0FBVyxRQUFRLElBQUksSUFBSSxTQUFTLFFBQVEsR0FBRyxPQUFPLE9BQU8sVUFBVTtJQUN6RyxPQUFPO01BQ0wsYUFBYTtNQUNiLFVBQVU7TUFDVixTQUFTO01BQ1QsbUNBQVksU0FBUyxRQUFRLFVBQVU7UUFDckMsS0FBSyxnQkFBZ0IsV0FBVztVQUM5QixPQUFPLFNBQVMsS0FBSyxjQUFjOzs7TUFHdkMsT0FBTzs7UUFFTCxPQUFPOzs7UUFHUCxVQUFVO1FBQ1YsVUFBVTtRQUNWLFdBQVc7O1FBRVgsa0JBQWtCO1FBQ2xCLFdBQVc7UUFDWCxvQkFBb0I7UUFDcEIsV0FBVztRQUNYLFVBQVU7UUFDVixVQUFVO1FBQ1YsVUFBVTtRQUNWLFNBQVM7UUFDVCxXQUFXO1FBQ1gsU0FBUzs7Ozs7UUFLVCxVQUFVOztRQUVWLGNBQWM7UUFDZCxXQUFXO1FBQ1gsWUFBWTtRQUNaLGdCQUFnQjtRQUNoQixXQUFXO1FBQ1gsU0FBUztRQUNULFlBQVk7UUFDWixVQUFVO1FBQ1YsZUFBZTs7O1FBR2YsYUFBYTs7UUFFYixnQkFBZ0I7UUFDaEIsWUFBWTtRQUNaLGFBQWE7UUFDYixjQUFjO1FBQ2QsY0FBYzs7TUFFaEIsTUFBTSxTQUFTLFNBQVMsT0FBTztRQUM3QixNQUFNLFlBQVk7UUFDbEIsTUFBTSxTQUFTO1FBQ2YsTUFBTSxVQUFVOzs7UUFHaEIsTUFBTSxvQkFBb0I7UUFDMUIsTUFBTSxpQkFBaUIsU0FBUyxPQUFPO1VBQ3JDLElBQUksVUFBVSxhQUFhLE1BQU0sWUFBWTtZQUMzQyxNQUFNLG9CQUFvQixDQUFDLE1BQU07O2VBRTlCO1lBQ0gsVUFBVSxJQUFJLE9BQU8sTUFBTTs7OztRQUkvQixJQUFJLGVBQWU7O1FBRW5CLE1BQU0scUJBQXFCLFNBQVMsVUFBVSxPQUFPO1VBQ25ELE1BQU0sVUFBVTs7VUFFaEIsZUFBZSxTQUFTLFdBQVc7WUFDakMsQ0FBQyxNQUFNLGFBQWEsSUFBSSxTQUFTLFNBQVM7OztZQUcxQyxJQUFJLE1BQU0sTUFBTSxlQUFlO2NBQzdCLElBQUksZ0JBQWdCLE1BQU0sTUFBTTtjQUNoQyxJQUFJLGNBQWMsYUFBYSxjQUFjLFVBQVUsVUFBVSxjQUFjLFVBQVUsT0FBTyxPQUFPO2dCQUNyRyxJQUFJLG9CQUFvQixjQUFjLFVBQVUsT0FBTyxNQUFNO2dCQUM3RCxDQUFDLE1BQU0sYUFBYSxJQUFJLHFCQUFxQjs7OztZQUlqRCxPQUFPLGVBQWUsT0FBTyxRQUFRLHNCQUFzQixNQUFNLE1BQU0sV0FBVztjQUNoRixrQkFBa0IsU0FBUztjQUMzQixNQUFNLE1BQU07OztZQUdkLElBQUksTUFBTSxvQkFBb0I7Y0FDNUIsTUFBTSxRQUFRLE1BQU0sTUFBTTs7YUFFM0I7OztRQUdMLE1BQU0sb0JBQW9CLFNBQVMsVUFBVSxPQUFPO1VBQ2xELE1BQU0sVUFBVTs7VUFFaEIsSUFBSSxjQUFjOztZQUVoQixTQUFTLE9BQU87O1VBRWxCLGVBQWU7O1VBRWYsSUFBSSxDQUFDLE1BQU0sYUFBYSxJQUFJLFNBQVMsUUFBUTs7WUFFM0MsT0FBTyxlQUFlLE9BQU8sUUFBUSx3QkFBd0IsTUFBTSxNQUFNLFdBQVc7Y0FDbEYsa0JBQWtCLFNBQVM7Y0FDM0IsTUFBTSxNQUFNOzs7WUFHZCxDQUFDLE1BQU0sYUFBYSxJQUFJLFNBQVMsU0FBUzs7O1lBRzFDLElBQUksTUFBTSxNQUFNLGVBQWU7Y0FDN0IsSUFBSSxnQkFBZ0IsTUFBTSxNQUFNO2NBQ2hDLElBQUksY0FBYyxhQUFhLGNBQWMsVUFBVSxVQUFVLGNBQWMsVUFBVSxPQUFPLE9BQU87Z0JBQ3JHLElBQUksb0JBQW9CLGNBQWMsVUFBVSxPQUFPLE1BQU07Z0JBQzdELE9BQU8sQ0FBQyxNQUFNLGFBQWEsSUFBSTs7OztZQUluQyxJQUFJLE1BQU0sb0JBQW9CO2NBQzVCLE1BQU0sUUFBUTs7Ozs7UUFLcEIsTUFBTSxvQkFBb0IsU0FBUyxPQUFPLE9BQU87VUFDL0MsSUFBSSxNQUFNLGVBQWU7WUFDdkIsSUFBSSxNQUFNLGNBQWMsYUFBYSxNQUFNLGNBQWMsVUFBVSxRQUFRO2NBQ3pFLE9BQU8sTUFBTSxjQUFjLFVBQVUsT0FBTzs7O1VBR2hELE9BQU87OztRQUdULE1BQU0sc0JBQXNCLFNBQVMsT0FBTyxPQUFPO1VBQ2pELElBQUksTUFBTSxlQUFlO1lBQ3ZCLElBQUksTUFBTSxjQUFjLGFBQWEsTUFBTSxjQUFjLFVBQVUsUUFBUTtjQUN6RSxPQUFPLE1BQU0sY0FBYyxVQUFVLE9BQU87OztVQUdoRCxPQUFPOzs7UUFHVCxNQUFNLGlCQUFpQixTQUFTLE9BQU87VUFDckMsVUFBVSxPQUFPO1VBQ2pCLE1BQU0sb0JBQW9COzs7UUFHNUIsTUFBTSxlQUFlLFdBQVc7VUFDOUIsTUFBTSxvQkFBb0I7Ozs7UUFJNUIsTUFBTSxjQUFjOztRQUVwQixNQUFNLGtCQUFrQixFQUFFLEtBQUssV0FBVztVQUN4QyxNQUFNLGNBQWM7OztRQUd0QixNQUFNLFVBQVUsU0FBUyxNQUFNLE9BQU87VUFDcEMsUUFBUSxJQUFJLEtBQUssU0FBUyxLQUFLLFVBQVU7Ozs7O1FBSzNDLE1BQU0sTUFBTTtRQUNaLE1BQU0sSUFBSSxVQUFVLFNBQVMsTUFBTSxTQUFTO1VBQzFDLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTztVQUNwQixJQUFJLFdBQVcsS0FBSztZQUNsQixXQUFXLFNBQVM7O1VBRXRCLE9BQU8sWUFBWSxTQUFTLFNBQVMsR0FBRyxLQUFLLGdCQUFnQixDQUFDLFNBQVM7OztRQUd6RSxNQUFNLElBQUksU0FBUyxTQUFTLE1BQU0sU0FBUztVQUN6QyxJQUFJLENBQUMsTUFBTSxJQUFJLFFBQVEsTUFBTSxVQUFVLEVBQUU7O1VBRXpDLElBQUksV0FBVyxLQUFLLFNBQVM7WUFDM0IsUUFBUSxTQUFTLFFBQVEsU0FBUyxTQUFTOztVQUU3QyxJQUFJLE1BQU0sYUFBYTtZQUNyQixNQUFNLFFBQVEsU0FBUyxNQUFNLFNBQVMsUUFBUSxXQUFXO2lCQUNwRDtZQUNMLE1BQU0sT0FBTyxNQUFNLFNBQVMsUUFBUSxXQUFXOzs7VUFHakQsT0FBTyxlQUFlLE9BQU8sUUFBUSxZQUFZLE1BQU0sTUFBTSxXQUFXO1lBQ3RFLE1BQU0sTUFBTTs7OztRQUloQixNQUFNLElBQUksU0FBUyxTQUFTLE1BQU0sU0FBUztVQUN6QyxJQUFJLENBQUMsTUFBTSxJQUFJLFFBQVEsTUFBTSxVQUFVLEVBQUU7O1VBRXpDLElBQUksV0FBVyxLQUFLLFNBQVM7WUFDM0IsUUFBUSxTQUFTOztVQUVuQixPQUFPLFNBQVMsTUFBTSxTQUFTOzs7Ozs7UUFNakMsTUFBTSxtQkFBbUIsU0FBUyxNQUFNO1VBQ3RDLE9BQU8sZUFBZSxPQUFPLFFBQVEsb0JBQW9CLE1BQU0sTUFBTSxXQUFXO1lBQzlFLE1BQU0sTUFBTTs7O1VBR2QsSUFBSSxNQUFNLGFBQWE7WUFDckIsTUFBTTtpQkFDRDtZQUNMLEtBQUssWUFBWSxLQUFLLGFBQWE7WUFDbkMsS0FBSyxVQUFVLGdCQUFnQixLQUFLLFVBQVUsa0JBQWtCLE9BQU8sWUFBWTs7OztRQUl2RixNQUFNLGlCQUFpQixVQUFVLFNBQVMsTUFBTTtVQUM5QyxJQUFJLFlBQVksR0FBRyxLQUFLLFVBQVU7VUFDbEMsS0FBSyxJQUFJLEtBQUssV0FBVztZQUN2QixJQUFJLFdBQVcsVUFBVTtZQUN6QixJQUFJLEVBQUUsU0FBUyxDQUFDLEdBQUcsS0FBSyxTQUFTLEdBQUcsS0FBSyxVQUFVLFNBQVMsU0FBUyxRQUFRLE9BQU8sTUFBTSxVQUFVLFVBQVUsR0FBRztjQUMvRyxPQUFPOzs7VUFHWCxPQUFPOzs7Ozs7UUFNVCxJQUFJLGFBQWEsTUFBTSxhQUFhOztRQUVwQyxXQUFXLFFBQVEsQ0FBQyxxQkFBcUI7VUFDdkMsMEJBQTBCLDJCQUEyQjs7UUFFdkQsV0FBVyxTQUFTLFNBQVMsTUFBTTs7VUFFakMsSUFBSSxjQUFjLFdBQVcsS0FBSztVQUNsQyxJQUFJLG1CQUFtQixXQUFXLE1BQU0sUUFBUTs7VUFFaEQsSUFBSSxlQUFlLENBQUMsbUJBQW1CLE1BQU0sV0FBVyxNQUFNLFNBQVM7VUFDdkUsSUFBSSxVQUFVLFdBQVcsTUFBTTs7VUFFL0IsT0FBTyxlQUFlLE9BQU8sUUFBUSxhQUFhLE1BQU0sTUFBTSxXQUFXO1lBQ3ZFLGFBQWE7WUFDYixTQUFTO1lBQ1QsTUFBTSxNQUFNOzs7VUFHZCxJQUFJLFdBQVcsV0FBVyxTQUFTOztVQUVuQyxJQUFJLE1BQU0sYUFBYTtZQUNyQixNQUFNLEtBQUssU0FBUyxTQUFTLFdBQVcsUUFBUSxTQUFTO2lCQUNwRDtZQUNMLEtBQUssU0FBUyxTQUFTLFNBQVMsT0FBTyxXQUFXLFFBQVEsU0FBUzs7Ozs7UUFLdkUsV0FBVyxVQUFVLFNBQVMsTUFBTSxNQUFNO1VBQ3hDLElBQUksU0FBUyxxQkFBcUI7WUFDaEMsT0FBTzs7O1VBR1QsSUFBSSxTQUFTLHNCQUFzQjtZQUNqQyxPQUFPOzs7VUFHVCxJQUFJLFdBQVcsV0FBVyxTQUFTO1VBQ25DLElBQUksVUFBVSxLQUFLLFNBQVMsU0FBUzs7VUFFckMsSUFBSSxTQUFTLDBCQUEwQjtZQUNyQyxPQUFPO2NBQ0wsSUFBSSxRQUFRO2NBQ1osT0FBTyxRQUFRO2NBQ2YsT0FBTzs7OztVQUlYLElBQUksU0FBUywyQkFBMkI7WUFDdEMsT0FBTztjQUNMLElBQUksUUFBUTtjQUNaLE9BQU8sUUFBUTtjQUNmLE9BQU87Ozs7VUFJWCxPQUFPOzs7UUFHVCxXQUFXLE9BQU8sU0FBUyxNQUFNO1VBQy9CLElBQUksV0FBVyxXQUFXLFNBQVM7VUFDbkMsSUFBSSxPQUFPLEtBQUssU0FBUyxTQUFTLFNBQVM7O1VBRTNDLElBQUksU0FBUyxXQUFXO1lBQ3RCLE9BQU87OztVQUdULEtBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxXQUFXLE1BQU0sU0FBUyxJQUFJLEtBQUs7O1lBRXJELElBQUksT0FBTyxXQUFXLE1BQU07WUFDNUIsSUFBSSxhQUFhLFdBQVcsUUFBUSxNQUFNOztZQUUxQyxJQUFJLEVBQUUsUUFBUSxNQUFNLGFBQWE7Y0FDL0IsT0FBTzs7OztVQUlYLElBQUksR0FBRyxLQUFLLFNBQVMsU0FBUyxLQUFLLE1BQU0sS0FBSyxPQUFPO1lBQ25ELE9BQU87O1VBRVQsUUFBUSxNQUFNO1VBQ2QsT0FBTzs7O1FBR1QsV0FBVyxXQUFXLFNBQVMsTUFBTTtVQUNuQyxPQUFPLEtBQUssU0FBUyxFQUFFLFNBQVMsR0FBRyxLQUFLLFdBQVcsS0FBSyxTQUFTLEVBQUUsU0FBUyxHQUFHLEtBQUs7a0JBQzVFLENBQUMsU0FBUyxLQUFLLGNBQWM7a0JBQzdCLENBQUMsU0FBUyxLQUFLLGNBQWM7OztRQUd2QyxXQUFXLFVBQVUsU0FBUyxNQUFNO1VBQ2xDLElBQUksV0FBVyxLQUFLOztVQUVwQixJQUFJLEdBQUcsU0FBUyxJQUFJLFVBQVUsVUFBVSxHQUFHLFNBQVMsSUFBSSxVQUFVO1lBQ2hFLENBQUMsR0FBRyxTQUFTLElBQUksVUFBVSxRQUFRLENBQUMsR0FBRyxTQUFTLElBQUksVUFBVTtZQUM5RCxDQUFDLEdBQUcsU0FBUyxZQUFZLEtBQUssV0FBVztZQUN6QyxPQUFPOzs7VUFHVCxPQUFPO2NBQ0gsQ0FBQyxTQUFTLEVBQUUsU0FBUyxHQUFHLEtBQUssV0FBVyxTQUFTLEVBQUUsU0FBUyxHQUFHLEtBQUs7Y0FDcEUsR0FBRyxTQUFTLFVBQVUsU0FBUztnQkFDN0I7WUFDSjtjQUNFLENBQUMsU0FBUyxFQUFFLFNBQVMsR0FBRyxLQUFLLFdBQVcsU0FBUyxFQUFFLFNBQVMsR0FBRyxLQUFLO2NBQ3BFLEdBQUcsU0FBUyxVQUFVLFNBQVM7Z0JBQzdCLE1BQU07OztRQUdkLE1BQU0sa0JBQWtCLFNBQVMsUUFBUTtVQUN2QyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsUUFBUSxTQUFTO1lBQzFDLE9BQU87OztVQUdULElBQUksaUJBQWlCLFVBQVUsV0FBVyxTQUFTLFFBQVE7WUFDekQsT0FBTyxVQUFVLFdBQVcsS0FBSzs7VUFFbkMsSUFBSSxpQkFBaUIsbUJBQW1CLE1BQU0sWUFBWTs7VUFFMUQsUUFBUTtZQUNOLEtBQUs7Y0FDSCxPQUFPLGlCQUFpQjtZQUMxQixLQUFLO2NBQ0gsT0FBTyxpQkFBaUI7WUFDMUIsS0FBSztjQUNILE9BQU8saUJBQWlCO1lBQzFCLEtBQUs7Y0FDSCxPQUFPLGlCQUFpQjtZQUMxQjtjQUNFLE9BQU8saUJBQWlCOzs7O1FBSTlCLE1BQU0sWUFBWSxXQUFXO1VBQzNCLE9BQU8sZUFBZSxPQUFPLFFBQVEsa0JBQWtCLE1BQU0sTUFBTSxXQUFXO1lBQzVFLE1BQU0sTUFBTTs7VUFFZCxJQUFJLE1BQU0sYUFBYTtZQUNyQixNQUFNO2lCQUNEO1lBQ0wsTUFBTSxVQUFVLE1BQU0sTUFBTTs7OztRQUloQyxNQUFNLElBQUksWUFBWSxXQUFXO1VBQy9CLE1BQU0sUUFBUTs7Ozs7QUFLeEI7OztBQzVZQTs7Ozs7Ozs7QUFRQSxRQUFRLE9BQU87R0FDWixVQUFVLDZCQUFvQixVQUFVLE1BQU07SUFDN0MsT0FBTztNQUNMLGFBQWE7TUFDYixVQUFVO01BQ1YsU0FBUztNQUNULE9BQU87TUFDUCxNQUFNLFNBQVMsU0FBUyxPQUFPLFNBQVMsT0FBTyx1QkFBdUI7UUFDcEUsSUFBSSxhQUFhLElBQUksS0FBSztVQUN4QixTQUFTLFFBQVEsS0FBSyxhQUFhO1VBQ25DLFFBQVEsc0JBQXNCO1VBQzlCLFVBQVU7VUFDVixRQUFRO1VBQ1IsbUJBQW1COzs7UUFHckIsTUFBTSxJQUFJLFlBQVksV0FBVztVQUMvQixXQUFXOzs7OztBQUtyQjs7O0FDOUJBOztBQUVBLFFBQVEsT0FBTztHQUNaLFVBQVUsc0ZBQW1CLFVBQVUsSUFBSSxLQUFLLFFBQVEsUUFBUSxHQUFHLFFBQVEsT0FBTyxPQUFPO0lBQ3hGLE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLFNBQVM7TUFDVCxPQUFPOztRQUVMLG9CQUFvQjtRQUNwQixjQUFjO1FBQ2QsV0FBVztRQUNYLGVBQWU7UUFDZixRQUFRO1FBQ1IsVUFBVTtRQUNWLFVBQVU7UUFDVixrQkFBa0I7O01BRXBCLE1BQU0sU0FBUyxTQUFTLDRCQUE0QjtRQUNsRCxNQUFNLFNBQVM7UUFDZixNQUFNLFFBQVEsTUFBTSxnQkFBZ0I7OztRQUdwQyxNQUFNLFdBQVcsTUFBTTtRQUN2QixNQUFNLGdCQUFnQjtRQUN0QixNQUFNLFdBQVc7UUFDakIsTUFBTSxTQUFTO1FBQ2YsTUFBTSxRQUFROzs7Ozs7Ozs7O1FBVWQsU0FBUyxnQkFBZ0I7VUFDdkIsTUFBTSxTQUFTO1VBQ2YsT0FBTyxlQUFlLE9BQU8sUUFBUSxXQUFXLE1BQU0sT0FBTztZQUMzRCxNQUFNLE1BQU07Ozs7O1FBS2hCLFNBQVMsU0FBUyxPQUFPO1VBQ3ZCLEtBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxNQUFNLE9BQU8sUUFBUSxLQUFLO1lBQzVDLEdBQUcsTUFBTSxjQUFjLE1BQU0sT0FBTyxHQUFHLFdBQVc7Y0FDaEQsT0FBTzs7O1VBR1gsT0FBTzs7O1FBR1QsU0FBUyxPQUFPLE9BQU87VUFDckIsT0FBTyxlQUFlLE9BQU8sUUFBUSxhQUFhLE1BQU0sV0FBVztZQUNqRSxNQUFNLE1BQU07O1VBRWQsTUFBTSxNQUFNLE1BQU07VUFDbEIsSUFBSSxNQUFNLGtCQUFrQjtZQUMxQixNQUFNOzs7Ozs7QUFNbEI7OztBQ25FQTs7QUFFQSxRQUFRLE9BQU87R0FDWixPQUFPLHlCQUFlLFNBQVMsT0FBTztJQUNyQyxPQUFPLFNBQVMsT0FBTztNQUNyQixPQUFPLE1BQU0sVUFBVSxPQUFPLE1BQU0sTUFBTTs7O0FBR2hEOzs7QUNSQTs7Ozs7Ozs7OztBQVVBLFFBQVEsT0FBTztHQUNaLE9BQU8sYUFBYSxZQUFZO0lBQy9CLE9BQU8sVUFBVSxPQUFPO01BQ3RCLE9BQU8sT0FBTyxVQUFVOztLQUV6Qjs7OztBQ2ZMOzs7Ozs7Ozs7O0FBVUEsUUFBUSxPQUFPO0dBQ1osT0FBTyxrREFBYSxVQUFVLG1CQUFtQixHQUFHLFFBQVE7SUFDM0QsU0FBUyxjQUFjLFFBQVE7TUFDN0IsSUFBSSxNQUFNOztNQUVWLElBQUksT0FBTyxRQUFRO1FBQ2pCLElBQUksUUFBUSxVQUFVLGtCQUFrQixFQUFFLE9BQU8sT0FBTztRQUN4RCxPQUFPLHNCQUFzQixRQUFROzs7TUFHdkMsSUFBSSxPQUFPLE1BQU07UUFDZixJQUFJLE9BQU8sRUFBRSxLQUFLLE9BQU8sTUFBTTtRQUMvQixPQUFPLFVBQVUsa0JBQWtCO1FBQ25DLE9BQU8sc0JBQXNCLE9BQU87OztNQUd0QyxJQUFJLE9BQU8sT0FBTztRQUNoQixJQUFJLFFBQVEsRUFBRSxLQUFLLE9BQU8sT0FBTztRQUNqQyxRQUFRLFVBQVUsa0JBQWtCO1FBQ3BDLE9BQU8scUJBQXFCLFFBQVE7OztNQUd0QyxJQUFJLFdBQVc7TUFDZixRQUFRLE9BQU87UUFDYixLQUFLO1VBQ0gsT0FBTyxXQUFXO1VBQ2xCO1FBQ0YsS0FBSztVQUNILE9BQU8sV0FBVztVQUNsQjtRQUNGLEtBQUs7VUFDSCxPQUFPLFdBQVc7VUFDbEI7OztNQUdKLE9BQU87OztJQUdULFNBQVMsV0FBVyxRQUFRO01BQzFCLElBQUksTUFBTTtNQUNWLElBQUksT0FBTyxNQUFNO1FBQ2YsSUFBSSxPQUFPLEVBQUUsS0FBSyxPQUFPLE1BQU07UUFDL0IsT0FBTyxVQUFVLGtCQUFrQjtRQUNuQyxPQUFPLHNCQUFzQixPQUFPOztNQUV0QyxPQUFPOzs7SUFHVCxPQUFPLE9BQU8sVUFBVSxZQUFZLGdCQUFnQjtNQUNuRDs7OztBQzNETDs7Ozs7Ozs7OztBQVVBLFFBQVEsT0FBTztHQUNaLE9BQU8sb0JBQW9CLFlBQVk7SUFDdEMsT0FBTyxVQUFVLE9BQU87TUFDdEIsT0FBTyxRQUFRLE1BQU0sUUFBUSxPQUFPLE9BQU87O0tBRTVDOzs7O0FDZkw7O0FBRUEsUUFBUSxPQUFPO0dBQ1osUUFBUSw0QkFBVSxTQUFTLFVBQVUsR0FBRztJQUN2QyxJQUFJLFNBQVM7O0lBRWIsT0FBTyxTQUFTOztJQUVoQixPQUFPLE1BQU0sU0FBUyxLQUFLLFNBQVM7TUFDbEMsSUFBSSxVQUFVLENBQUMsS0FBSztNQUNwQixPQUFPLE9BQU8sS0FBSztNQUNuQixJQUFJLFNBQVM7UUFDWCxTQUFTLFdBQVc7VUFDbEIsSUFBSSxRQUFRLEVBQUUsVUFBVSxPQUFPLFFBQVE7VUFDdkMsT0FBTyxXQUFXO1dBQ2pCOzs7O0lBSVAsT0FBTyxhQUFhLFNBQVMsT0FBTztNQUNsQyxPQUFPLE9BQU8sT0FBTyxPQUFPOzs7SUFHOUIsT0FBTzs7QUFFWDs7O0FDekJBOzs7Ozs7Ozs7QUFTQSxRQUFRLE9BQU87R0FDWixRQUFRLHFFQUFhLFNBQVMsR0FBRyxJQUFJLHFCQUFxQixRQUFRLFNBQVM7SUFDMUUsSUFBSSxZQUFZLFdBQVc7TUFDekIsS0FBSyxPQUFPO01BQ1osS0FBSyxPQUFPO01BQ1osS0FBSyxjQUFjLG9CQUFvQjs7O0lBR3pDLElBQUksUUFBUSxVQUFVOztJQUV0QixNQUFNLE9BQU8sV0FBVztNQUN0QixvQkFBb0IsSUFBSSxnQkFBZ0IsS0FBSzs7O0lBRy9DLE1BQU0sa0JBQWtCLFNBQVMsV0FBVztNQUMxQyxFQUFFLEtBQUssS0FBSyxNQUFNLFNBQVMsVUFBVSxFQUFFLE9BQU8sU0FBUyxjQUFjO1NBQ2xFLE1BQU0sYUFBYSxLQUFLLEtBQUssV0FBVztNQUMzQyxLQUFLOzs7O0lBSVAsTUFBTSxTQUFTLFdBQVc7TUFDeEIsSUFBSSxhQUFhLEtBQUs7OztNQUd0QixJQUFJLGNBQWM7TUFDbEIsRUFBRSxRQUFRLEtBQUssTUFBTSxTQUFTLFVBQVU7UUFDdEMsSUFBSSxPQUFPLFNBQVMsTUFBTTtRQUMxQixLQUFLLGNBQWMsV0FBVyxTQUFTLFdBQVc7UUFDbEQsWUFBWSxLQUFLOzs7O01BSW5CLElBQUksZUFBZSxPQUFPO01BQzFCLGFBQWEsU0FBUztNQUN0QixhQUFhLFNBQVMsTUFBTSxzQkFBc0IsS0FBSyxVQUFVLGFBQWEsTUFBTSxLQUFLO01BQ3pGLGFBQWEsU0FBUzs7O0lBR3hCLE1BQU0sT0FBTyxXQUFXO01BQ3RCLEtBQUssT0FBTyxvQkFBb0IsSUFBSSxtQkFBbUI7OztNQUd2RCxJQUFJLGFBQWEsS0FBSztNQUN0QixFQUFFLFFBQVEsS0FBSyxNQUFNLFNBQVMsVUFBVTtRQUN0QyxXQUFXLFNBQVMsYUFBYSxFQUFFLFVBQVUsU0FBUzs7OztJQUkxRCxNQUFNLFFBQVEsV0FBVztNQUN2QixLQUFLLEtBQUssT0FBTyxHQUFHLEtBQUssS0FBSztNQUM5QixLQUFLLE9BQU87TUFDWixLQUFLOztNQUVMLE9BQU8sZUFBZSxPQUFPLFFBQVE7OztJQUd2QyxNQUFNLE1BQU0sU0FBUyxPQUFPLFdBQVc7TUFDckMsSUFBSSxZQUFZLE1BQU07TUFDdEIsTUFBTSxhQUFhLElBQUksT0FBTzs7O01BRzlCLE1BQU0sU0FBUyxRQUFROztNQUV2QixLQUFLLEtBQUssTUFBTSxhQUFhLEVBQUUsVUFBVTs7TUFFekMsS0FBSyxLQUFLLEtBQUs7UUFDYixXQUFXO1FBQ1gsTUFBTTtRQUNOLE9BQU8sRUFBRSxVQUFVOzs7TUFHckIsS0FBSzs7TUFFTCxPQUFPLGVBQWUsT0FBTyxRQUFRLGNBQWMsV0FBVztRQUM1RCxNQUFNOzs7O0lBSVYsTUFBTSxTQUFTLFNBQVMsT0FBTztNQUM3QixJQUFJLFlBQVksTUFBTTs7O01BR3RCLElBQUksUUFBUSxLQUFLLEtBQUssVUFBVSxTQUFTLFVBQVUsRUFBRSxPQUFPLFNBQVMsY0FBYztNQUNuRixJQUFJO01BQ0osSUFBSSxTQUFTLEdBQUc7UUFDZCxVQUFVLEtBQUssS0FBSyxPQUFPLE9BQU8sR0FBRzs7OztNQUl2QyxPQUFPLEtBQUssS0FBSyxNQUFNOztNQUV2QixLQUFLOztNQUVMLE9BQU8sZUFBZSxPQUFPLFFBQVEsaUJBQWlCLFdBQVc7UUFDL0QsTUFBTSxDQUFDLFdBQVcsSUFBSTs7OztJQUkxQixNQUFNLFVBQVUsV0FBVztNQUN6QixLQUFLOzs7SUFHUCxNQUFNLGVBQWUsU0FBUyxXQUFXO01BQ3ZDLE9BQU8sS0FBSyxLQUFLLGVBQWU7OztJQUdsQyxNQUFNLHFCQUFxQixXQUFXO01BQ3BDLE9BQU8sZUFBZSxPQUFPLFFBQVE7OztJQUd2QyxPQUFPLElBQUk7O0FBRWY7OztBQzFIQTs7QUFFQSxRQUFRLE9BQU87R0FDWixRQUFRLHNCQUFTLFVBQVUsS0FBSyxHQUFHO0lBQ2xDLElBQUksUUFBUTtNQUNWLFVBQVU7TUFDVixXQUFXOzs7Ozs7O0lBT2IsU0FBUyxTQUFTLE1BQU07TUFDdEIsSUFBSSxDQUFDLE1BQU07UUFDVCxPQUFPOztVQUVMLFFBQVE7VUFDUixVQUFVOzs7VUFHVixXQUFXO1VBQ1gsZUFBZTs7OztNQUluQixJQUFJLFFBQVEsZ0JBQWdCLElBQUksTUFBTTtRQUNwQyxLQUFLO1FBQ0w7TUFDRixPQUFPO1FBQ0wsZUFBZSxNQUFNO1FBQ3JCLFVBQVUsTUFBTSxVQUFVO1FBQzFCLFFBQVEsTUFBTTtRQUNkLFdBQVcsTUFBTTs7OztJQUlyQixTQUFTLFVBQVUsTUFBTTtNQUN2QixJQUFJLFdBQVcsRUFBRSxNQUFNLEtBQUs7TUFDNUIsSUFBSSxVQUFVLFNBQVM7TUFDdkIsSUFBSSxVQUFVLFNBQVM7TUFDdkIsU0FBUyxJQUFJO01BQ2IsU0FBUyxJQUFJOztNQUViLElBQUksWUFBWSxTQUFTO01BQ3pCLElBQUksWUFBWSxTQUFTO01BQ3pCLFNBQVMsTUFBTTtNQUNmLFNBQVMsU0FBUzs7TUFFbEIsS0FBSyxXQUFXOzs7SUFHbEIsT0FBTztNQUNOOzs7O0FDckRMOzs7O0FBSUEsUUFBUSxPQUFPO0dBQ1osUUFBUSxVQUFVLFdBQVc7SUFDNUIsSUFBSSxTQUFTOztJQUViLE9BQU8sT0FBTztJQUNkLE9BQU8sU0FBUzs7SUFFaEIsT0FBTyxZQUFZLFdBQVc7TUFDNUIsT0FBTzs7O0lBR1QsT0FBTyxVQUFVLFdBQVc7TUFDMUIsT0FBTyxPQUFPOzs7SUFHaEIsT0FBTyxRQUFRLFdBQVc7TUFDeEIsT0FBTztRQUNMLE1BQU07VUFDSixPQUFPO1VBQ1AsUUFBUTs7UUFFVixPQUFPO1VBQ0wsTUFBTTtZQUNKLE9BQU87WUFDUCxRQUFROzs7Ozs7SUFNaEIsT0FBTyxRQUFRLFdBQVc7TUFDeEIsT0FBTztRQUNMLE9BQU87VUFDTCxNQUFNO1lBQ0osT0FBTztZQUNQLFFBQVE7Ozs7OztJQU1oQixPQUFPLGdCQUFnQixTQUFTLFNBQVMsTUFBTTtNQUM3QyxJQUFJLFFBQVEsUUFBUTtRQUNsQixPQUFPLEtBQUssU0FBUyxRQUFRO1FBQzdCLE9BQU8sT0FBTyxLQUFLO1FBQ25CLE9BQU8sS0FBSyxhQUFhO2FBQ3BCO1FBQ0wsT0FBTyxLQUFLLE1BQU0sUUFBUTtRQUMxQixPQUFPLE9BQU8sS0FBSztRQUNuQixPQUFPLEtBQUssYUFBYTs7OztJQUk3QixPQUFPOztBQUVYOzs7QUMzREE7Ozs7Ozs7OztBQVNBLFFBQVEsT0FBTztHQUNaLFFBQVEsaUdBQVUsVUFBVSxXQUFXLFNBQVMsU0FBUyxHQUFHLFFBQVEsV0FBVyxNQUFNLE1BQU0sS0FBSzs7SUFFL0YsSUFBSSxVQUFVOztJQUVkLFFBQVEsU0FBUztNQUNmLEtBQUssQ0FBQyxHQUFHLE9BQU8sS0FBSztNQUNyQixPQUFPLENBQUMsR0FBRyxTQUFTLEtBQUs7TUFDekIsT0FBTyxDQUFDLEdBQUcsU0FBUyxLQUFLO01BQ3pCLE1BQU0sQ0FBQyxHQUFHLFFBQVEsS0FBSztNQUN2QixNQUFNLENBQUMsR0FBRyxRQUFRLEtBQUs7TUFDdkIsT0FBTyxDQUFDLEdBQUcsU0FBUyxLQUFLO01BQ3pCLE9BQU8sQ0FBQyxHQUFHLFNBQVMsS0FBSzs7O0lBRzNCLFFBQVEsVUFBVTs7TUFFaEIsWUFBWSxDQUFDLFVBQVUsUUFBUSxJQUFJLGNBQWMsT0FBTyxRQUFRLE9BQU87TUFDdkUsTUFBTSxDQUFDLFVBQVUsUUFBUSxJQUFJLFFBQVEsT0FBTyxRQUFRLE9BQU87TUFDM0QsTUFBTSxDQUFDLFVBQVUsUUFBUSxJQUFJLFFBQVEsT0FBTyxRQUFRLE9BQU87TUFDM0QsZ0JBQWdCLENBQUMsVUFBVSxRQUFRLElBQUksa0JBQWtCLE9BQU8sUUFBUSxPQUFPO01BQy9FLGNBQWMsQ0FBQyxVQUFVLFFBQVEsSUFBSSxnQkFBZ0IsT0FBTyxRQUFRLE9BQU87TUFDM0UsbUJBQW1CLENBQUMsVUFBVSxRQUFRLElBQUkscUJBQXFCLE9BQU8sUUFBUSxPQUFPO01BQ3JGLGlCQUFpQixDQUFDLFVBQVUsUUFBUSxJQUFJLG1CQUFtQixPQUFPLFFBQVEsT0FBTzs7TUFFakYsY0FBYyxDQUFDLFVBQVUsWUFBWSxHQUFHLGdCQUFnQixPQUFPLFFBQVEsT0FBTztNQUM5RSxpQkFBaUIsQ0FBQyxVQUFVLFlBQVksR0FBRyxtQkFBbUIsT0FBTyxRQUFRLE9BQU87TUFDcEYsZUFBZSxDQUFDLFVBQVUsWUFBWSxHQUFHLGlCQUFpQixPQUFPLFFBQVEsT0FBTztNQUNoRixnQkFBZ0IsQ0FBQyxVQUFVLFlBQVksR0FBRyxrQkFBa0IsT0FBTyxRQUFRLE9BQU87TUFDbEYsZ0JBQWdCLENBQUMsVUFBVSxZQUFZLElBQUksa0JBQWtCLE9BQU8sUUFBUSxPQUFPOztNQUVuRixpQkFBaUIsQ0FBQyxVQUFVLFNBQVMsR0FBRyxtQkFBbUIsT0FBTyxRQUFRLE9BQU87TUFDakYsZ0JBQWdCLENBQUMsVUFBVSxTQUFTLEdBQUcsa0JBQWtCLE9BQU8sUUFBUSxPQUFPO01BQy9FLGNBQWMsQ0FBQyxVQUFVLFNBQVMsR0FBRyxnQkFBZ0IsT0FBTyxRQUFRLE9BQU87TUFDM0UsY0FBYyxDQUFDLFVBQVUsU0FBUyxHQUFHLGdCQUFnQixPQUFPLFFBQVEsT0FBTztNQUMzRSxlQUFlLENBQUMsVUFBVSxTQUFTLEdBQUcsaUJBQWlCLE9BQU8sUUFBUSxPQUFPO01BQzdFLG1CQUFtQixDQUFDLFVBQVUsU0FBUyxHQUFHLHFCQUFxQixPQUFPLFFBQVEsT0FBTzs7TUFFckYsYUFBYSxDQUFDLFVBQVUsU0FBUyxHQUFHLGVBQWUsT0FBTyxRQUFRLE9BQU87TUFDekUsYUFBYSxDQUFDLFVBQVUsU0FBUyxHQUFHLGVBQWUsT0FBTyxRQUFRLE9BQU87TUFDekUsaUJBQWlCLENBQUMsVUFBVSxTQUFTLEdBQUcsbUJBQW1CLE9BQU8sUUFBUSxPQUFPO01BQ2pGLGtCQUFrQixDQUFDLFVBQVUsU0FBUyxJQUFJLG9CQUFvQixPQUFPLFFBQVEsT0FBTztNQUNwRixZQUFZLENBQUMsVUFBVSxTQUFTLElBQUksY0FBYyxPQUFPLFFBQVEsT0FBTztNQUN4RSxrQkFBa0IsQ0FBQyxVQUFVLFNBQVMsSUFBSSxvQkFBb0IsT0FBTyxRQUFRLE9BQU87TUFDcEYsb0JBQW9CLENBQUMsVUFBVSxTQUFTLEdBQUcsc0JBQXNCLE9BQU8sUUFBUSxPQUFPOztNQUV2RixnQkFBZ0IsQ0FBQyxVQUFVLFNBQVMsR0FBRyxrQkFBa0IsT0FBTyxRQUFRLE9BQU87TUFDL0UsV0FBVyxDQUFDLFVBQVUsU0FBUyxHQUFHLGFBQWEsT0FBTyxRQUFRLE9BQU87OztNQUdyRSxlQUFlLENBQUMsVUFBVSxVQUFVLElBQUksaUJBQWlCLE9BQU8sUUFBUSxPQUFPO01BQy9FLGNBQWMsQ0FBQyxVQUFVLFVBQVUsSUFBSSxnQkFBZ0IsT0FBTyxRQUFRLE9BQU87TUFDN0UsYUFBYSxDQUFDLFVBQVUsVUFBVSxJQUFJLGVBQWUsT0FBTyxRQUFRLE9BQU87TUFDM0UsV0FBVyxDQUFDLFVBQVUsVUFBVSxJQUFJLGFBQWEsT0FBTyxRQUFRLE9BQU87OztNQUd2RSxzQkFBc0IsQ0FBQyxVQUFVLGFBQWEsSUFBSSx3QkFBd0IsT0FBTyxRQUFRLE9BQU87TUFDaEcsd0JBQXdCLENBQUMsVUFBVSxhQUFhLElBQUksMEJBQTBCLE9BQU8sUUFBUSxPQUFPOzs7TUFHcEcsWUFBWSxDQUFDLFNBQVMsWUFBWSxJQUFJLGNBQWMsT0FBTyxRQUFRLE9BQU87TUFDMUUsYUFBYSxDQUFDLFNBQVMsWUFBWSxJQUFJLGVBQWUsT0FBTyxRQUFRLE9BQU87TUFDNUUsWUFBWSxDQUFDLFVBQVUsWUFBWSxJQUFJLGNBQWMsT0FBTyxRQUFRLE9BQU87TUFDM0UsYUFBYSxDQUFDLFVBQVUsWUFBWSxJQUFJLGVBQWUsT0FBTyxRQUFRLE9BQU87OztNQUc3RSxhQUFhLENBQUMsU0FBUyxZQUFZLElBQUksZUFBZSxPQUFPLFFBQVEsT0FBTzs7O01BRzVFLHVCQUF1QixDQUFDLFNBQVMsZ0JBQWdCLElBQUkseUJBQXlCLE9BQU8sUUFBUSxPQUFPO01BQ3BHLDBCQUEwQixDQUFDLFNBQVMsZ0JBQWdCLElBQUksNEJBQTRCLE9BQU8sUUFBUSxPQUFPO01BQzFHLDBCQUEwQixDQUFDLFNBQVMsZ0JBQWdCLElBQUksNEJBQTRCLE9BQU8sUUFBUSxPQUFPOzs7TUFHMUcsc0JBQXNCLENBQUMsU0FBUyxXQUFXLElBQUksd0JBQXdCLE9BQU8sUUFBUSxPQUFPO01BQzdGLHVCQUF1QixDQUFDLFNBQVMsV0FBVyxJQUFJLHlCQUF5QixPQUFPLFFBQVEsT0FBTzs7OztJQUlqRyxJQUFJLFFBQVEsaUJBQWlCLFdBQVc7TUFDdEMsUUFBUSxLQUFLO01BQ2IsUUFBUSxpQkFBaUIsV0FBVztNQUNwQyxPQUFPOzs7O0lBSVQsSUFBSSxTQUFTLFFBQVEsU0FBUyxVQUFVLFNBQVM7O0lBRWpELFFBQVEsS0FBSyxRQUFRLGFBQWEsUUFBUSxPQUFPLFFBQVEsSUFBSSxPQUFPOztJQUVwRSxRQUFRLFlBQVksVUFBVSxPQUFPOzs7SUFHckMsUUFBUSx5QkFBeUIsV0FBVztNQUMxQyxRQUFRLEdBQUcsWUFBWSxRQUFRLFdBQVc7UUFDeEMsVUFBVTtVQUNSLFFBQVE7VUFDUixRQUFROztRQUVWLFFBQVE7VUFDTixRQUFRO1VBQ1IsUUFBUTs7UUFFVixrQkFBa0I7VUFDaEIsUUFBUTtVQUNSLFFBQVE7O1FBRVYsWUFBWTtVQUNWLFFBQVE7VUFDUixRQUFROztRQUVWLFNBQVM7VUFDUCxRQUFRO1VBQ1IsUUFBUTs7UUFFVixRQUFRO1VBQ04sUUFBUTs7Ozs7SUFLZCxRQUFRLFFBQVEsV0FBVztNQUN6QixJQUFJLElBQUksUUFBUSxRQUFRO01BQ3hCLElBQUksTUFBTSxNQUFNO1FBQ2QsUUFBUSxHQUFHLFVBQVUsUUFBUTtRQUM3QixRQUFROzs7O0lBSVosUUFBUSxTQUFTLFdBQVc7TUFDMUIsUUFBUSxHQUFHLFVBQVUsUUFBUSxXQUFXLEtBQUssU0FBUyxTQUFTO1FBQzdELElBQUksUUFBUSxLQUFLLFdBQVcsR0FBRztVQUM3QixRQUFRLEtBQUs7VUFDYjs7O1FBR0YsSUFBSSxPQUFPOztRQUVYLElBQUksSUFBSSxFQUFFLEdBQUcsSUFBSSxRQUFRLEtBQUssUUFBUSxLQUFLO1VBQ3pDLEtBQUssS0FBSyxRQUFRLEtBQUssS0FBSzs7O1FBRzlCLElBQUksTUFBTSxLQUFLLFFBQVE7O1FBRXZCLElBQUksVUFBVSxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTTtRQUN0QyxJQUFJLFNBQVMsSUFBSSxnQkFBZ0I7O1FBRWpDLElBQUksVUFBVSxRQUFRLFFBQVE7UUFDOUIsUUFBUSxLQUFLO1VBQ1gsTUFBTTtVQUNOLFFBQVE7VUFDUixVQUFVLFFBQVEsWUFBWSxNQUFNLFNBQVMsTUFBTSxJQUFJLE9BQU8sZ0JBQWdCO1dBQzdFLEdBQUc7Ozs7O0lBS1YsUUFBUSxpQkFBaUIsU0FBUyxRQUFRLE9BQU8sTUFBTTtNQUNyRCxJQUFJLENBQUMsT0FBTyxTQUFTO1FBQ25COztNQUVGLElBQUksUUFBUSxPQUFPLEtBQUssUUFBUTtNQUNoQyxHQUFHLE9BQU8sTUFBTSxRQUFRLFFBQVEsT0FBTyxPQUFPLFlBQVksUUFBUSxNQUFNO1FBQ3RFLFVBQVUsV0FBVyxPQUFPLFVBQVUsT0FBTyxJQUFJLE9BQU87O1FBRXhELElBQUksT0FBTyxhQUFhO1VBQ3RCLElBQUksTUFBTTtZQUNSLFFBQVE7WUFDUixNQUFNLElBQUksT0FBTztZQUNqQixnQkFBZ0IsT0FBTztZQUN2QixVQUFVLE9BQU87WUFDakIsT0FBTyxFQUFFLFNBQVMsU0FBUyxLQUFLLFVBQVUsU0FBUztZQUNuRCxNQUFNLE9BQU8sS0FBSyxVQUFVLFFBQVE7O1VBRXRDLFFBQVEsR0FBRyxPQUFPLFFBQVEsV0FBVzs7O1FBR3ZDLElBQUksT0FBTyxNQUFNLFFBQVEsUUFBUSxPQUFPLE9BQU8saUJBQWlCLFFBQVEsTUFBTTtVQUM1RSxRQUFRLElBQUksY0FBYyxPQUFPLElBQUksT0FBTzs7Ozs7SUFLbEQsUUFBUTtJQUNSLFFBQVEsSUFBSSxRQUFRLE9BQU8sT0FBTztJQUNsQyxRQUFRLGVBQWUsUUFBUSxRQUFRLFlBQVksT0FBTzs7SUFFMUQsT0FBTzs7QUFFWDs7O0FDdE1BOztBQUVBLFFBQVEsT0FBTztHQUNaLFFBQVEseUJBQVMsVUFBVSxLQUFLLE1BQU07SUFDckMsSUFBSSxRQUFROztNQUVWLGNBQWM7TUFDZCxxQkFBcUI7TUFDckIsc0JBQXNCO01BQ3RCLHFCQUFxQjtNQUNyQixtQkFBbUI7O01BRW5CLEtBQUs7O01BRUwsV0FBVztNQUNYLFVBQVU7Ozs7TUFJVixLQUFLOzs7TUFHTCxRQUFROzs7TUFHUixLQUFLOzs7TUFHTCxTQUFTO01BQ1QsTUFBTTtNQUNOLHFCQUFxQjtNQUNyQixXQUFXOzs7TUFHWCxPQUFPOzs7TUFHUCxTQUFTOzs7TUFHVCxRQUFROztNQUVSLE9BQU87TUFDUCxVQUFVOzs7O01BSVYsT0FBTztNQUNQLGFBQWE7O01BRWIsVUFBVTs7TUFFVixhQUFhOztNQUViLFVBQVU7Ozs7Ozs7O0lBUVosU0FBUyxhQUFhLFdBQVc7TUFDL0IsT0FBTyxhQUFhLFVBQVUsUUFBUSxTQUFTOzs7SUFHakQsU0FBUyx1QkFBdUI7TUFDOUIsSUFBSSxjQUFjLEtBQUssS0FBSyxNQUFNLE9BQU8sT0FBTyxTQUFTLFdBQVc7UUFDbEUsT0FBTyxVQUFVLFFBQVEsU0FBUzs7TUFFcEMsS0FBSyxJQUFJLEVBQUUsSUFBSSxJQUFJLFlBQVksUUFBUSxLQUFLO1FBQzFDLElBQUksWUFBWSxZQUFZO1FBQzVCLElBQUksQ0FBQyxNQUFNLE1BQU0sV0FBVyxPQUFPO1VBQ2pDLE9BQU87OztNQUdYLE1BQU0sSUFBSSxNQUFNOzs7SUFHbEIsU0FBUyxzQkFBc0I7TUFDN0IsSUFBSSxJQUFJO01BQ1IsT0FBTyxNQUFNLE1BQU0sTUFBTSxJQUFJO1FBQzNCOztNQUVGLE9BQU8sTUFBTTs7Ozs7Ozs7O0lBU2YsU0FBUyxJQUFJLFdBQVcsVUFBVSxRQUFRO01BQ3hDLE1BQU0sTUFBTSxhQUFhOztNQUV6QixJQUFJLFVBQVUsTUFBTSxVQUFVO1FBQzVCLE1BQU0sU0FBUyxJQUFJLFdBQVc7Ozs7Ozs7SUFPbEMsU0FBUyxJQUFJLFdBQVc7TUFDdEIsT0FBTyxNQUFNLE1BQU07OztJQUdyQixTQUFTLElBQUksVUFBVTtNQUNyQixJQUFJLE1BQU0sWUFBWSxNQUFNLFNBQVMsS0FBSztRQUN4QyxNQUFNLFNBQVMsSUFBSTs7OztJQUl2QixTQUFTLG9CQUFvQixXQUFXO01BQ3RDLElBQUksTUFBTSxZQUFZLE1BQU0sU0FBUyxxQkFBcUI7UUFDeEQsT0FBTyxNQUFNLFNBQVMsb0JBQW9CLFdBQVcsTUFBTSxNQUFNOztNQUVuRSxPQUFPOzs7SUFHVCxTQUFTLGtCQUFrQixXQUFXO01BQ3BDLElBQUksTUFBTSxZQUFZLE1BQU0sU0FBUyxtQkFBbUI7UUFDdEQsT0FBTyxNQUFNLFNBQVMsa0JBQWtCLFdBQVcsTUFBTSxNQUFNOztNQUVqRSxPQUFPOzs7SUFHVCxTQUFTLE9BQU8sV0FBVztNQUN6QixPQUFPLE1BQU0sTUFBTTtNQUNuQixJQUFJLE1BQU0sVUFBVTtRQUNsQixNQUFNLFNBQVMsT0FBTzs7OztJQUkxQixTQUFTLEtBQUssV0FBVyxNQUFNO01BQzdCLElBQUksTUFBTSxZQUFZLE1BQU0sU0FBUyxNQUFNO1FBQ3pDLE1BQU0sU0FBUyxLQUFLLFdBQVc7Ozs7SUFJbkMsU0FBUyxRQUFRLFdBQVcsV0FBVztNQUNyQyxJQUFJLE1BQU0sWUFBWSxNQUFNLFNBQVMsU0FBUztRQUM1QyxNQUFNLFNBQVMsUUFBUSxXQUFXOzs7O0lBSXRDLFNBQVMsc0JBQXNCO01BQzdCLElBQUksTUFBTSxZQUFZLE1BQU0sU0FBUyxxQkFBcUI7UUFDeEQsTUFBTSxTQUFTOzs7O0lBSW5CLFNBQVMsWUFBWTtNQUNuQixJQUFJLE1BQU0sWUFBWSxNQUFNLFNBQVMsV0FBVztRQUM5QyxNQUFNLFNBQVM7Ozs7Ozs7OztJQVNuQixTQUFTLE1BQU0sTUFBTTtNQUNuQixJQUFJLE1BQU0sVUFBVTtRQUNsQixNQUFNLFNBQVMsTUFBTTs7Ozs7Ozs7O0lBU3pCLFNBQVMsUUFBUSxNQUFNO01BQ3JCLElBQUksTUFBTSxVQUFVO1FBQ2xCLE1BQU0sU0FBUyxRQUFROzs7Ozs7Ozs7SUFTM0IsU0FBUyxPQUFPLE1BQU07TUFDcEIsSUFBSSxNQUFNLFVBQVU7UUFDbEIsTUFBTSxTQUFTLE9BQU87Ozs7OztJQU0xQixTQUFTLFFBQVE7TUFDZixJQUFJLE1BQU0sVUFBVTtRQUNsQixNQUFNLFNBQVM7Ozs7Ozs7O0lBUW5CLFNBQVMsVUFBVSxNQUFNLGFBQWE7TUFDcEMsTUFBTSxXQUFXO01BQ2pCLE1BQU0sY0FBYzs7OztJQUl0QixTQUFTLFdBQVc7TUFDbEIsTUFBTSxXQUFXOzs7Ozs7O0lBT25CLFNBQVMsU0FBUyxXQUFXO01BQzNCLElBQUksTUFBTSxVQUFVO1FBQ2xCLE1BQU0sU0FBUyxTQUFTLFdBQVcsTUFBTTs7OztJQUk3QyxPQUFPOztBQUVYOzs7QUNsT0E7OztBQUdBLFFBQVEsT0FBTztHQUNaLFFBQVEsbUNBQVUsU0FBUyxJQUFJLElBQUksVUFBVTtJQUM1QyxJQUFJLFNBQVM7O0lBRWIsT0FBTyxTQUFTOztJQUVoQixPQUFPLG1CQUFtQixTQUFTLFNBQVM7TUFDMUMsSUFBSSxNQUFNO01BQ1YsSUFBSSxzQkFBc0IsT0FBTyxPQUFPLFlBQVksU0FBUyxXQUFXOztNQUV4RSxJQUFJLE1BQU07U0FDUCxvQkFBb0IsUUFBUSxvQkFBb0IsTUFBTSxHQUFHO1FBQzFEO01BQ0YsTUFBTSxJQUFJLE1BQU0sSUFBSSxZQUFZLEtBQUs7TUFDckMsT0FBTyxPQUFPLE9BQU8sWUFBWTs7O0lBR25DLE9BQU87O0FBRVgiLCJmaWxlIjoidmx1aS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogSlNPTjMgd2l0aCBjb21wYWN0IHN0cmluZ2lmeSAtLSBNb2RpZmllZCBieSBLYW5pdCBXb25nc3VwaGFzYXdhdC4gICBodHRwczovL2dpdGh1Yi5jb20va2FuaXR3L2pzb24zXG4gKlxuICogRm9ya2VkIGZyb20gSlNPTiB2My4zLjIgfCBodHRwczovL2Jlc3RpZWpzLmdpdGh1Yi5pby9qc29uMyB8IENvcHlyaWdodCAyMDEyLTIwMTQsIEtpdCBDYW1icmlkZ2UgfCBodHRwOi8va2l0Lm1pdC1saWNlbnNlLm9yZ1xuICovXG47KGZ1bmN0aW9uICgpIHtcbiAgLy8gRGV0ZWN0IHRoZSBgZGVmaW5lYCBmdW5jdGlvbiBleHBvc2VkIGJ5IGFzeW5jaHJvbm91cyBtb2R1bGUgbG9hZGVycy4gVGhlXG4gIC8vIHN0cmljdCBgZGVmaW5lYCBjaGVjayBpcyBuZWNlc3NhcnkgZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBgci5qc2AuXG4gIHZhciBpc0xvYWRlciA9IHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kO1xuXG4gIC8vIEEgc2V0IG9mIHR5cGVzIHVzZWQgdG8gZGlzdGluZ3Vpc2ggb2JqZWN0cyBmcm9tIHByaW1pdGl2ZXMuXG4gIHZhciBvYmplY3RUeXBlcyA9IHtcbiAgICBcImZ1bmN0aW9uXCI6IHRydWUsXG4gICAgXCJvYmplY3RcIjogdHJ1ZVxuICB9O1xuXG4gIC8vIERldGVjdCB0aGUgYGV4cG9ydHNgIG9iamVjdCBleHBvc2VkIGJ5IENvbW1vbkpTIGltcGxlbWVudGF0aW9ucy5cbiAgdmFyIGZyZWVFeHBvcnRzID0gb2JqZWN0VHlwZXNbdHlwZW9mIGV4cG9ydHNdICYmIGV4cG9ydHMgJiYgIWV4cG9ydHMubm9kZVR5cGUgJiYgZXhwb3J0cztcblxuICAvLyBVc2UgdGhlIGBnbG9iYWxgIG9iamVjdCBleHBvc2VkIGJ5IE5vZGUgKGluY2x1ZGluZyBCcm93c2VyaWZ5IHZpYVxuICAvLyBgaW5zZXJ0LW1vZHVsZS1nbG9iYWxzYCksIE5hcndoYWwsIGFuZCBSaW5nbyBhcyB0aGUgZGVmYXVsdCBjb250ZXh0LFxuICAvLyBhbmQgdGhlIGB3aW5kb3dgIG9iamVjdCBpbiBicm93c2Vycy4gUmhpbm8gZXhwb3J0cyBhIGBnbG9iYWxgIGZ1bmN0aW9uXG4gIC8vIGluc3RlYWQuXG4gIHZhciByb290ID0gb2JqZWN0VHlwZXNbdHlwZW9mIHdpbmRvd10gJiYgd2luZG93IHx8IHRoaXMsXG4gICAgICBmcmVlR2xvYmFsID0gZnJlZUV4cG9ydHMgJiYgb2JqZWN0VHlwZXNbdHlwZW9mIG1vZHVsZV0gJiYgbW9kdWxlICYmICFtb2R1bGUubm9kZVR5cGUgJiYgdHlwZW9mIGdsb2JhbCA9PSBcIm9iamVjdFwiICYmIGdsb2JhbDtcblxuICBpZiAoZnJlZUdsb2JhbCAmJiAoZnJlZUdsb2JhbFtcImdsb2JhbFwiXSA9PT0gZnJlZUdsb2JhbCB8fCBmcmVlR2xvYmFsW1wid2luZG93XCJdID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWxbXCJzZWxmXCJdID09PSBmcmVlR2xvYmFsKSkge1xuICAgIHJvb3QgPSBmcmVlR2xvYmFsO1xuICB9XG5cbiAgLy8gUHVibGljOiBJbml0aWFsaXplcyBKU09OIDMgdXNpbmcgdGhlIGdpdmVuIGBjb250ZXh0YCBvYmplY3QsIGF0dGFjaGluZyB0aGVcbiAgLy8gYHN0cmluZ2lmeWAgYW5kIGBwYXJzZWAgZnVuY3Rpb25zIHRvIHRoZSBzcGVjaWZpZWQgYGV4cG9ydHNgIG9iamVjdC5cbiAgZnVuY3Rpb24gcnVuSW5Db250ZXh0KGNvbnRleHQsIGV4cG9ydHMpIHtcbiAgICBjb250ZXh0IHx8IChjb250ZXh0ID0gcm9vdFtcIk9iamVjdFwiXSgpKTtcbiAgICBleHBvcnRzIHx8IChleHBvcnRzID0gcm9vdFtcIk9iamVjdFwiXSgpKTtcblxuICAgIC8vIE5hdGl2ZSBjb25zdHJ1Y3RvciBhbGlhc2VzLlxuICAgIHZhciBOdW1iZXIgPSBjb250ZXh0W1wiTnVtYmVyXCJdIHx8IHJvb3RbXCJOdW1iZXJcIl0sXG4gICAgICAgIFN0cmluZyA9IGNvbnRleHRbXCJTdHJpbmdcIl0gfHwgcm9vdFtcIlN0cmluZ1wiXSxcbiAgICAgICAgT2JqZWN0ID0gY29udGV4dFtcIk9iamVjdFwiXSB8fCByb290W1wiT2JqZWN0XCJdLFxuICAgICAgICBEYXRlID0gY29udGV4dFtcIkRhdGVcIl0gfHwgcm9vdFtcIkRhdGVcIl0sXG4gICAgICAgIFN5bnRheEVycm9yID0gY29udGV4dFtcIlN5bnRheEVycm9yXCJdIHx8IHJvb3RbXCJTeW50YXhFcnJvclwiXSxcbiAgICAgICAgVHlwZUVycm9yID0gY29udGV4dFtcIlR5cGVFcnJvclwiXSB8fCByb290W1wiVHlwZUVycm9yXCJdLFxuICAgICAgICBNYXRoID0gY29udGV4dFtcIk1hdGhcIl0gfHwgcm9vdFtcIk1hdGhcIl0sXG4gICAgICAgIG5hdGl2ZUpTT04gPSBjb250ZXh0W1wiSlNPTlwiXSB8fCByb290W1wiSlNPTlwiXTtcblxuICAgIC8vIERlbGVnYXRlIHRvIHRoZSBuYXRpdmUgYHN0cmluZ2lmeWAgYW5kIGBwYXJzZWAgaW1wbGVtZW50YXRpb25zLlxuICAgIGlmICh0eXBlb2YgbmF0aXZlSlNPTiA9PSBcIm9iamVjdFwiICYmIG5hdGl2ZUpTT04pIHtcbiAgICAgIGV4cG9ydHMuc3RyaW5naWZ5ID0gbmF0aXZlSlNPTi5zdHJpbmdpZnk7XG4gICAgICBleHBvcnRzLnBhcnNlID0gbmF0aXZlSlNPTi5wYXJzZTtcbiAgICB9XG5cbiAgICAvLyBDb252ZW5pZW5jZSBhbGlhc2VzLlxuICAgIHZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGUsXG4gICAgICAgIGdldENsYXNzID0gb2JqZWN0UHJvdG8udG9TdHJpbmcsXG4gICAgICAgIGlzUHJvcGVydHksIGZvckVhY2gsIHVuZGVmO1xuXG4gICAgLy8gVGVzdCB0aGUgYERhdGUjZ2V0VVRDKmAgbWV0aG9kcy4gQmFzZWQgb24gd29yayBieSBAWWFmZmxlLlxuICAgIHZhciBpc0V4dGVuZGVkID0gbmV3IERhdGUoLTM1MDk4MjczMzQ1NzMyOTIpO1xuICAgIHRyeSB7XG4gICAgICAvLyBUaGUgYGdldFVUQ0Z1bGxZZWFyYCwgYE1vbnRoYCwgYW5kIGBEYXRlYCBtZXRob2RzIHJldHVybiBub25zZW5zaWNhbFxuICAgICAgLy8gcmVzdWx0cyBmb3IgY2VydGFpbiBkYXRlcyBpbiBPcGVyYSA+PSAxMC41My5cbiAgICAgIGlzRXh0ZW5kZWQgPSBpc0V4dGVuZGVkLmdldFVUQ0Z1bGxZZWFyKCkgPT0gLTEwOTI1MiAmJiBpc0V4dGVuZGVkLmdldFVUQ01vbnRoKCkgPT09IDAgJiYgaXNFeHRlbmRlZC5nZXRVVENEYXRlKCkgPT09IDEgJiZcbiAgICAgICAgLy8gU2FmYXJpIDwgMi4wLjIgc3RvcmVzIHRoZSBpbnRlcm5hbCBtaWxsaXNlY29uZCB0aW1lIHZhbHVlIGNvcnJlY3RseSxcbiAgICAgICAgLy8gYnV0IGNsaXBzIHRoZSB2YWx1ZXMgcmV0dXJuZWQgYnkgdGhlIGRhdGUgbWV0aG9kcyB0byB0aGUgcmFuZ2Ugb2ZcbiAgICAgICAgLy8gc2lnbmVkIDMyLWJpdCBpbnRlZ2VycyAoWy0yICoqIDMxLCAyICoqIDMxIC0gMV0pLlxuICAgICAgICBpc0V4dGVuZGVkLmdldFVUQ0hvdXJzKCkgPT0gMTAgJiYgaXNFeHRlbmRlZC5nZXRVVENNaW51dGVzKCkgPT0gMzcgJiYgaXNFeHRlbmRlZC5nZXRVVENTZWNvbmRzKCkgPT0gNiAmJiBpc0V4dGVuZGVkLmdldFVUQ01pbGxpc2Vjb25kcygpID09IDcwODtcbiAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG5cbiAgICAvLyBJbnRlcm5hbDogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBuYXRpdmUgYEpTT04uc3RyaW5naWZ5YCBhbmQgYHBhcnNlYFxuICAgIC8vIGltcGxlbWVudGF0aW9ucyBhcmUgc3BlYy1jb21wbGlhbnQuIEJhc2VkIG9uIHdvcmsgYnkgS2VuIFNueWRlci5cbiAgICBmdW5jdGlvbiBoYXMobmFtZSkge1xuICAgICAgaWYgKGhhc1tuYW1lXSAhPT0gdW5kZWYpIHtcbiAgICAgICAgLy8gUmV0dXJuIGNhY2hlZCBmZWF0dXJlIHRlc3QgcmVzdWx0LlxuICAgICAgICByZXR1cm4gaGFzW25hbWVdO1xuICAgICAgfVxuICAgICAgdmFyIGlzU3VwcG9ydGVkO1xuICAgICAgaWYgKG5hbWUgPT0gXCJidWctc3RyaW5nLWNoYXItaW5kZXhcIikge1xuICAgICAgICAvLyBJRSA8PSA3IGRvZXNuJ3Qgc3VwcG9ydCBhY2Nlc3Npbmcgc3RyaW5nIGNoYXJhY3RlcnMgdXNpbmcgc3F1YXJlXG4gICAgICAgIC8vIGJyYWNrZXQgbm90YXRpb24uIElFIDggb25seSBzdXBwb3J0cyB0aGlzIGZvciBwcmltaXRpdmVzLlxuICAgICAgICBpc1N1cHBvcnRlZCA9IFwiYVwiWzBdICE9IFwiYVwiO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09IFwianNvblwiKSB7XG4gICAgICAgIC8vIEluZGljYXRlcyB3aGV0aGVyIGJvdGggYEpTT04uc3RyaW5naWZ5YCBhbmQgYEpTT04ucGFyc2VgIGFyZVxuICAgICAgICAvLyBzdXBwb3J0ZWQuXG4gICAgICAgIGlzU3VwcG9ydGVkID0gaGFzKFwianNvbi1zdHJpbmdpZnlcIikgJiYgaGFzKFwianNvbi1wYXJzZVwiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB2YWx1ZSwgc2VyaWFsaXplZCA9ICd7XCJhXCI6WzEsdHJ1ZSxmYWxzZSxudWxsLFwiXFxcXHUwMDAwXFxcXGJcXFxcblxcXFxmXFxcXHJcXFxcdFwiXX0nO1xuICAgICAgICAvLyBUZXN0IGBKU09OLnN0cmluZ2lmeWAuXG4gICAgICAgIGlmIChuYW1lID09IFwianNvbi1zdHJpbmdpZnlcIikge1xuICAgICAgICAgIHZhciBzdHJpbmdpZnkgPSBleHBvcnRzLnN0cmluZ2lmeSwgc3RyaW5naWZ5U3VwcG9ydGVkID0gdHlwZW9mIHN0cmluZ2lmeSA9PSBcImZ1bmN0aW9uXCIgJiYgaXNFeHRlbmRlZDtcbiAgICAgICAgICBpZiAoc3RyaW5naWZ5U3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAvLyBBIHRlc3QgZnVuY3Rpb24gb2JqZWN0IHdpdGggYSBjdXN0b20gYHRvSlNPTmAgbWV0aG9kLlxuICAgICAgICAgICAgKHZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0pLnRvSlNPTiA9IHZhbHVlO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgc3RyaW5naWZ5U3VwcG9ydGVkID1cbiAgICAgICAgICAgICAgICAvLyBGaXJlZm94IDMuMWIxIGFuZCBiMiBzZXJpYWxpemUgc3RyaW5nLCBudW1iZXIsIGFuZCBib29sZWFuXG4gICAgICAgICAgICAgICAgLy8gcHJpbWl0aXZlcyBhcyBvYmplY3QgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KDApID09PSBcIjBcIiAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCBiMiwgYW5kIEpTT04gMiBzZXJpYWxpemUgd3JhcHBlZCBwcmltaXRpdmVzIGFzIG9iamVjdFxuICAgICAgICAgICAgICAgIC8vIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgTnVtYmVyKCkpID09PSBcIjBcIiAmJlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgU3RyaW5nKCkpID09ICdcIlwiJyAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCAyIHRocm93IGFuIGVycm9yIGlmIHRoZSB2YWx1ZSBpcyBgbnVsbGAsIGB1bmRlZmluZWRgLCBvclxuICAgICAgICAgICAgICAgIC8vIGRvZXMgbm90IGRlZmluZSBhIGNhbm9uaWNhbCBKU09OIHJlcHJlc2VudGF0aW9uICh0aGlzIGFwcGxpZXMgdG9cbiAgICAgICAgICAgICAgICAvLyBvYmplY3RzIHdpdGggYHRvSlNPTmAgcHJvcGVydGllcyBhcyB3ZWxsLCAqdW5sZXNzKiB0aGV5IGFyZSBuZXN0ZWRcbiAgICAgICAgICAgICAgICAvLyB3aXRoaW4gYW4gb2JqZWN0IG9yIGFycmF5KS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoZ2V0Q2xhc3MpID09PSB1bmRlZiAmJlxuICAgICAgICAgICAgICAgIC8vIElFIDggc2VyaWFsaXplcyBgdW5kZWZpbmVkYCBhcyBgXCJ1bmRlZmluZWRcImAuIFNhZmFyaSA8PSA1LjEuNyBhbmRcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMyBwYXNzIHRoaXMgdGVzdC5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkodW5kZWYpID09PSB1bmRlZiAmJlxuICAgICAgICAgICAgICAgIC8vIFNhZmFyaSA8PSA1LjEuNyBhbmQgRkYgMy4xYjMgdGhyb3cgYEVycm9yYHMgYW5kIGBUeXBlRXJyb3JgcyxcbiAgICAgICAgICAgICAgICAvLyByZXNwZWN0aXZlbHksIGlmIHRoZSB2YWx1ZSBpcyBvbWl0dGVkIGVudGlyZWx5LlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSgpID09PSB1bmRlZiAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCAyIHRocm93IGFuIGVycm9yIGlmIHRoZSBnaXZlbiB2YWx1ZSBpcyBub3QgYSBudW1iZXIsXG4gICAgICAgICAgICAgICAgLy8gc3RyaW5nLCBhcnJheSwgb2JqZWN0LCBCb29sZWFuLCBvciBgbnVsbGAgbGl0ZXJhbC4gVGhpcyBhcHBsaWVzIHRvXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0cyB3aXRoIGN1c3RvbSBgdG9KU09OYCBtZXRob2RzIGFzIHdlbGwsIHVubGVzcyB0aGV5IGFyZSBuZXN0ZWRcbiAgICAgICAgICAgICAgICAvLyBpbnNpZGUgb2JqZWN0IG9yIGFycmF5IGxpdGVyYWxzLiBZVUkgMy4wLjBiMSBpZ25vcmVzIGN1c3RvbSBgdG9KU09OYFxuICAgICAgICAgICAgICAgIC8vIG1ldGhvZHMgZW50aXJlbHkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KHZhbHVlKSA9PT0gXCIxXCIgJiZcbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoW3ZhbHVlXSkgPT0gXCJbMV1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIFByb3RvdHlwZSA8PSAxLjYuMSBzZXJpYWxpemVzIGBbdW5kZWZpbmVkXWAgYXMgYFwiW11cImAgaW5zdGVhZCBvZlxuICAgICAgICAgICAgICAgIC8vIGBcIltudWxsXVwiYC5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoW3VuZGVmXSkgPT0gXCJbbnVsbF1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIFlVSSAzLjAuMGIxIGZhaWxzIHRvIHNlcmlhbGl6ZSBgbnVsbGAgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG51bGwpID09IFwibnVsbFwiICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIDIgaGFsdHMgc2VyaWFsaXphdGlvbiBpZiBhbiBhcnJheSBjb250YWlucyBhIGZ1bmN0aW9uOlxuICAgICAgICAgICAgICAgIC8vIGBbMSwgdHJ1ZSwgZ2V0Q2xhc3MsIDFdYCBzZXJpYWxpemVzIGFzIFwiWzEsdHJ1ZSxdLFwiLiBGRiAzLjFiM1xuICAgICAgICAgICAgICAgIC8vIGVsaWRlcyBub24tSlNPTiB2YWx1ZXMgZnJvbSBvYmplY3RzIGFuZCBhcnJheXMsIHVubGVzcyB0aGV5XG4gICAgICAgICAgICAgICAgLy8gZGVmaW5lIGN1c3RvbSBgdG9KU09OYCBtZXRob2RzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbdW5kZWYsIGdldENsYXNzLCBudWxsXSkgPT0gXCJbbnVsbCxudWxsLG51bGxdXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBTaW1wbGUgc2VyaWFsaXphdGlvbiB0ZXN0LiBGRiAzLjFiMSB1c2VzIFVuaWNvZGUgZXNjYXBlIHNlcXVlbmNlc1xuICAgICAgICAgICAgICAgIC8vIHdoZXJlIGNoYXJhY3RlciBlc2NhcGUgY29kZXMgYXJlIGV4cGVjdGVkIChlLmcuLCBgXFxiYCA9PiBgXFx1MDAwOGApLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSh7IFwiYVwiOiBbdmFsdWUsIHRydWUsIGZhbHNlLCBudWxsLCBcIlxceDAwXFxiXFxuXFxmXFxyXFx0XCJdIH0pID09IHNlcmlhbGl6ZWQgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSBhbmQgYjIgaWdub3JlIHRoZSBgZmlsdGVyYCBhbmQgYHdpZHRoYCBhcmd1bWVudHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG51bGwsIHZhbHVlKSA9PT0gXCIxXCIgJiZcbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoWzEsIDJdLCBudWxsLCAxKSA9PSBcIltcXG4gMSxcXG4gMlxcbl1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIEpTT04gMiwgUHJvdG90eXBlIDw9IDEuNywgYW5kIG9sZGVyIFdlYktpdCBidWlsZHMgaW5jb3JyZWN0bHlcbiAgICAgICAgICAgICAgICAvLyBzZXJpYWxpemUgZXh0ZW5kZWQgeWVhcnMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBEYXRlKC04LjY0ZTE1KSkgPT0gJ1wiLTI3MTgyMS0wNC0yMFQwMDowMDowMC4wMDBaXCInICYmXG4gICAgICAgICAgICAgICAgLy8gVGhlIG1pbGxpc2Vjb25kcyBhcmUgb3B0aW9uYWwgaW4gRVMgNSwgYnV0IHJlcXVpcmVkIGluIDUuMS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoOC42NGUxNSkpID09ICdcIisyNzU3NjAtMDktMTNUMDA6MDA6MDAuMDAwWlwiJyAmJlxuICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggPD0gMTEuMCBpbmNvcnJlY3RseSBzZXJpYWxpemVzIHllYXJzIHByaW9yIHRvIDAgYXMgbmVnYXRpdmVcbiAgICAgICAgICAgICAgICAvLyBmb3VyLWRpZ2l0IHllYXJzIGluc3RlYWQgb2Ygc2l4LWRpZ2l0IHllYXJzLiBDcmVkaXRzOiBAWWFmZmxlLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSgtNjIxOTg3NTUyZTUpKSA9PSAnXCItMDAwMDAxLTAxLTAxVDAwOjAwOjAwLjAwMFpcIicgJiZcbiAgICAgICAgICAgICAgICAvLyBTYWZhcmkgPD0gNS4xLjUgYW5kIE9wZXJhID49IDEwLjUzIGluY29ycmVjdGx5IHNlcmlhbGl6ZSBtaWxsaXNlY29uZFxuICAgICAgICAgICAgICAgIC8vIHZhbHVlcyBsZXNzIHRoYW4gMTAwMC4gQ3JlZGl0czogQFlhZmZsZS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoLTEpKSA9PSAnXCIxOTY5LTEyLTMxVDIzOjU5OjU5Ljk5OVpcIic7XG4gICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgc3RyaW5naWZ5U3VwcG9ydGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlzU3VwcG9ydGVkID0gc3RyaW5naWZ5U3VwcG9ydGVkO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRlc3QgYEpTT04ucGFyc2VgLlxuICAgICAgICBpZiAobmFtZSA9PSBcImpzb24tcGFyc2VcIikge1xuICAgICAgICAgIHZhciBwYXJzZSA9IGV4cG9ydHMucGFyc2U7XG4gICAgICAgICAgaWYgKHR5cGVvZiBwYXJzZSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCBiMiB3aWxsIHRocm93IGFuIGV4Y2VwdGlvbiBpZiBhIGJhcmUgbGl0ZXJhbCBpcyBwcm92aWRlZC5cbiAgICAgICAgICAgICAgLy8gQ29uZm9ybWluZyBpbXBsZW1lbnRhdGlvbnMgc2hvdWxkIGFsc28gY29lcmNlIHRoZSBpbml0aWFsIGFyZ3VtZW50IHRvXG4gICAgICAgICAgICAgIC8vIGEgc3RyaW5nIHByaW9yIHRvIHBhcnNpbmcuXG4gICAgICAgICAgICAgIGlmIChwYXJzZShcIjBcIikgPT09IDAgJiYgIXBhcnNlKGZhbHNlKSkge1xuICAgICAgICAgICAgICAgIC8vIFNpbXBsZSBwYXJzaW5nIHRlc3QuXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBwYXJzZShzZXJpYWxpemVkKTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyc2VTdXBwb3J0ZWQgPSB2YWx1ZVtcImFcIl0ubGVuZ3RoID09IDUgJiYgdmFsdWVbXCJhXCJdWzBdID09PSAxO1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZVN1cHBvcnRlZCkge1xuICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDUuMS4yIGFuZCBGRiAzLjFiMSBhbGxvdyB1bmVzY2FwZWQgdGFicyBpbiBzdHJpbmdzLlxuICAgICAgICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9ICFwYXJzZSgnXCJcXHRcIicpO1xuICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gRkYgNC4wIGFuZCA0LjAuMSBhbGxvdyBsZWFkaW5nIGArYCBzaWducyBhbmQgbGVhZGluZ1xuICAgICAgICAgICAgICAgICAgICAgIC8vIGRlY2ltYWwgcG9pbnRzLiBGRiA0LjAsIDQuMC4xLCBhbmQgSUUgOS0xMCBhbHNvIGFsbG93XG4gICAgICAgICAgICAgICAgICAgICAgLy8gY2VydGFpbiBvY3RhbCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IHBhcnNlKFwiMDFcIikgIT09IDE7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChwYXJzZVN1cHBvcnRlZCkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEZGIDQuMCwgNC4wLjEsIGFuZCBSaGlubyAxLjdSMy1SNCBhbGxvdyB0cmFpbGluZyBkZWNpbWFsXG4gICAgICAgICAgICAgICAgICAgICAgLy8gcG9pbnRzLiBUaGVzZSBlbnZpcm9ubWVudHMsIGFsb25nIHdpdGggRkYgMy4xYjEgYW5kIDIsXG4gICAgICAgICAgICAgICAgICAgICAgLy8gYWxzbyBhbGxvdyB0cmFpbGluZyBjb21tYXMgaW4gSlNPTiBvYmplY3RzIGFuZCBhcnJheXMuXG4gICAgICAgICAgICAgICAgICAgICAgcGFyc2VTdXBwb3J0ZWQgPSBwYXJzZShcIjEuXCIpICE9PSAxO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgcGFyc2VTdXBwb3J0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaXNTdXBwb3J0ZWQgPSBwYXJzZVN1cHBvcnRlZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGhhc1tuYW1lXSA9ICEhaXNTdXBwb3J0ZWQ7XG4gICAgfVxuXG4gICAgaWYgKHRydWUpIHsgLy8gdXNlZCB0byBiZSAhaGFzKFwianNvblwiKVxuICAgICAgLy8gQ29tbW9uIGBbW0NsYXNzXV1gIG5hbWUgYWxpYXNlcy5cbiAgICAgIHZhciBmdW5jdGlvbkNsYXNzID0gXCJbb2JqZWN0IEZ1bmN0aW9uXVwiLFxuICAgICAgICAgIGRhdGVDbGFzcyA9IFwiW29iamVjdCBEYXRlXVwiLFxuICAgICAgICAgIG51bWJlckNsYXNzID0gXCJbb2JqZWN0IE51bWJlcl1cIixcbiAgICAgICAgICBzdHJpbmdDbGFzcyA9IFwiW29iamVjdCBTdHJpbmddXCIsXG4gICAgICAgICAgYXJyYXlDbGFzcyA9IFwiW29iamVjdCBBcnJheV1cIixcbiAgICAgICAgICBib29sZWFuQ2xhc3MgPSBcIltvYmplY3QgQm9vbGVhbl1cIjtcblxuICAgICAgLy8gRGV0ZWN0IGluY29tcGxldGUgc3VwcG9ydCBmb3IgYWNjZXNzaW5nIHN0cmluZyBjaGFyYWN0ZXJzIGJ5IGluZGV4LlxuICAgICAgdmFyIGNoYXJJbmRleEJ1Z2d5ID0gaGFzKFwiYnVnLXN0cmluZy1jaGFyLWluZGV4XCIpO1xuXG4gICAgICAvLyBEZWZpbmUgYWRkaXRpb25hbCB1dGlsaXR5IG1ldGhvZHMgaWYgdGhlIGBEYXRlYCBtZXRob2RzIGFyZSBidWdneS5cbiAgICAgIGlmICghaXNFeHRlbmRlZCkge1xuICAgICAgICB2YXIgZmxvb3IgPSBNYXRoLmZsb29yO1xuICAgICAgICAvLyBBIG1hcHBpbmcgYmV0d2VlbiB0aGUgbW9udGhzIG9mIHRoZSB5ZWFyIGFuZCB0aGUgbnVtYmVyIG9mIGRheXMgYmV0d2VlblxuICAgICAgICAvLyBKYW51YXJ5IDFzdCBhbmQgdGhlIGZpcnN0IG9mIHRoZSByZXNwZWN0aXZlIG1vbnRoLlxuICAgICAgICB2YXIgTW9udGhzID0gWzAsIDMxLCA1OSwgOTAsIDEyMCwgMTUxLCAxODEsIDIxMiwgMjQzLCAyNzMsIDMwNCwgMzM0XTtcbiAgICAgICAgLy8gSW50ZXJuYWw6IENhbGN1bGF0ZXMgdGhlIG51bWJlciBvZiBkYXlzIGJldHdlZW4gdGhlIFVuaXggZXBvY2ggYW5kIHRoZVxuICAgICAgICAvLyBmaXJzdCBkYXkgb2YgdGhlIGdpdmVuIG1vbnRoLlxuICAgICAgICB2YXIgZ2V0RGF5ID0gZnVuY3Rpb24gKHllYXIsIG1vbnRoKSB7XG4gICAgICAgICAgcmV0dXJuIE1vbnRoc1ttb250aF0gKyAzNjUgKiAoeWVhciAtIDE5NzApICsgZmxvb3IoKHllYXIgLSAxOTY5ICsgKG1vbnRoID0gKyhtb250aCA+IDEpKSkgLyA0KSAtIGZsb29yKCh5ZWFyIC0gMTkwMSArIG1vbnRoKSAvIDEwMCkgKyBmbG9vcigoeWVhciAtIDE2MDEgKyBtb250aCkgLyA0MDApO1xuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICAvLyBJbnRlcm5hbDogRGV0ZXJtaW5lcyBpZiBhIHByb3BlcnR5IGlzIGEgZGlyZWN0IHByb3BlcnR5IG9mIHRoZSBnaXZlblxuICAgICAgLy8gb2JqZWN0LiBEZWxlZ2F0ZXMgdG8gdGhlIG5hdGl2ZSBgT2JqZWN0I2hhc093blByb3BlcnR5YCBtZXRob2QuXG4gICAgICBpZiAoIShpc1Byb3BlcnR5ID0gb2JqZWN0UHJvdG8uaGFzT3duUHJvcGVydHkpKSB7XG4gICAgICAgIGlzUHJvcGVydHkgPSBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICB2YXIgbWVtYmVycyA9IHt9LCBjb25zdHJ1Y3RvcjtcbiAgICAgICAgICBpZiAoKG1lbWJlcnMuX19wcm90b19fID0gbnVsbCwgbWVtYmVycy5fX3Byb3RvX18gPSB7XG4gICAgICAgICAgICAvLyBUaGUgKnByb3RvKiBwcm9wZXJ0eSBjYW5ub3QgYmUgc2V0IG11bHRpcGxlIHRpbWVzIGluIHJlY2VudFxuICAgICAgICAgICAgLy8gdmVyc2lvbnMgb2YgRmlyZWZveCBhbmQgU2VhTW9ua2V5LlxuICAgICAgICAgICAgXCJ0b1N0cmluZ1wiOiAxXG4gICAgICAgICAgfSwgbWVtYmVycykudG9TdHJpbmcgIT0gZ2V0Q2xhc3MpIHtcbiAgICAgICAgICAgIC8vIFNhZmFyaSA8PSAyLjAuMyBkb2Vzbid0IGltcGxlbWVudCBgT2JqZWN0I2hhc093blByb3BlcnR5YCwgYnV0XG4gICAgICAgICAgICAvLyBzdXBwb3J0cyB0aGUgbXV0YWJsZSAqcHJvdG8qIHByb3BlcnR5LlxuICAgICAgICAgICAgaXNQcm9wZXJ0eSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAvLyBDYXB0dXJlIGFuZCBicmVhayB0aGUgb2JqZWN0J3MgcHJvdG90eXBlIGNoYWluIChzZWUgc2VjdGlvbiA4LjYuMlxuICAgICAgICAgICAgICAvLyBvZiB0aGUgRVMgNS4xIHNwZWMpLiBUaGUgcGFyZW50aGVzaXplZCBleHByZXNzaW9uIHByZXZlbnRzIGFuXG4gICAgICAgICAgICAgIC8vIHVuc2FmZSB0cmFuc2Zvcm1hdGlvbiBieSB0aGUgQ2xvc3VyZSBDb21waWxlci5cbiAgICAgICAgICAgICAgdmFyIG9yaWdpbmFsID0gdGhpcy5fX3Byb3RvX18sIHJlc3VsdCA9IHByb3BlcnR5IGluICh0aGlzLl9fcHJvdG9fXyA9IG51bGwsIHRoaXMpO1xuICAgICAgICAgICAgICAvLyBSZXN0b3JlIHRoZSBvcmlnaW5hbCBwcm90b3R5cGUgY2hhaW4uXG4gICAgICAgICAgICAgIHRoaXMuX19wcm90b19fID0gb3JpZ2luYWw7XG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBDYXB0dXJlIGEgcmVmZXJlbmNlIHRvIHRoZSB0b3AtbGV2ZWwgYE9iamVjdGAgY29uc3RydWN0b3IuXG4gICAgICAgICAgICBjb25zdHJ1Y3RvciA9IG1lbWJlcnMuY29uc3RydWN0b3I7XG4gICAgICAgICAgICAvLyBVc2UgdGhlIGBjb25zdHJ1Y3RvcmAgcHJvcGVydHkgdG8gc2ltdWxhdGUgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAgaW5cbiAgICAgICAgICAgIC8vIG90aGVyIGVudmlyb25tZW50cy5cbiAgICAgICAgICAgIGlzUHJvcGVydHkgPSBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgdmFyIHBhcmVudCA9ICh0aGlzLmNvbnN0cnVjdG9yIHx8IGNvbnN0cnVjdG9yKS5wcm90b3R5cGU7XG4gICAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eSBpbiB0aGlzICYmICEocHJvcGVydHkgaW4gcGFyZW50ICYmIHRoaXNbcHJvcGVydHldID09PSBwYXJlbnRbcHJvcGVydHldKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIG1lbWJlcnMgPSBudWxsO1xuICAgICAgICAgIHJldHVybiBpc1Byb3BlcnR5LmNhbGwodGhpcywgcHJvcGVydHkpO1xuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICAvLyBJbnRlcm5hbDogTm9ybWFsaXplcyB0aGUgYGZvci4uLmluYCBpdGVyYXRpb24gYWxnb3JpdGhtIGFjcm9zc1xuICAgICAgLy8gZW52aXJvbm1lbnRzLiBFYWNoIGVudW1lcmF0ZWQga2V5IGlzIHlpZWxkZWQgdG8gYSBgY2FsbGJhY2tgIGZ1bmN0aW9uLlxuICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBzaXplID0gMCwgUHJvcGVydGllcywgbWVtYmVycywgcHJvcGVydHk7XG5cbiAgICAgICAgLy8gVGVzdHMgZm9yIGJ1Z3MgaW4gdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQncyBgZm9yLi4uaW5gIGFsZ29yaXRobS4gVGhlXG4gICAgICAgIC8vIGB2YWx1ZU9mYCBwcm9wZXJ0eSBpbmhlcml0cyB0aGUgbm9uLWVudW1lcmFibGUgZmxhZyBmcm9tXG4gICAgICAgIC8vIGBPYmplY3QucHJvdG90eXBlYCBpbiBvbGRlciB2ZXJzaW9ucyBvZiBJRSwgTmV0c2NhcGUsIGFuZCBNb3ppbGxhLlxuICAgICAgICAoUHJvcGVydGllcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0aGlzLnZhbHVlT2YgPSAwO1xuICAgICAgICB9KS5wcm90b3R5cGUudmFsdWVPZiA9IDA7XG5cbiAgICAgICAgLy8gSXRlcmF0ZSBvdmVyIGEgbmV3IGluc3RhbmNlIG9mIHRoZSBgUHJvcGVydGllc2AgY2xhc3MuXG4gICAgICAgIG1lbWJlcnMgPSBuZXcgUHJvcGVydGllcygpO1xuICAgICAgICBmb3IgKHByb3BlcnR5IGluIG1lbWJlcnMpIHtcbiAgICAgICAgICAvLyBJZ25vcmUgYWxsIHByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gYE9iamVjdC5wcm90b3R5cGVgLlxuICAgICAgICAgIGlmIChpc1Byb3BlcnR5LmNhbGwobWVtYmVycywgcHJvcGVydHkpKSB7XG4gICAgICAgICAgICBzaXplKys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFByb3BlcnRpZXMgPSBtZW1iZXJzID0gbnVsbDtcblxuICAgICAgICAvLyBOb3JtYWxpemUgdGhlIGl0ZXJhdGlvbiBhbGdvcml0aG0uXG4gICAgICAgIGlmICghc2l6ZSkge1xuICAgICAgICAgIC8vIEEgbGlzdCBvZiBub24tZW51bWVyYWJsZSBwcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIGBPYmplY3QucHJvdG90eXBlYC5cbiAgICAgICAgICBtZW1iZXJzID0gW1widmFsdWVPZlwiLCBcInRvU3RyaW5nXCIsIFwidG9Mb2NhbGVTdHJpbmdcIiwgXCJwcm9wZXJ0eUlzRW51bWVyYWJsZVwiLCBcImlzUHJvdG90eXBlT2ZcIiwgXCJoYXNPd25Qcm9wZXJ0eVwiLCBcImNvbnN0cnVjdG9yXCJdO1xuICAgICAgICAgIC8vIElFIDw9IDgsIE1vemlsbGEgMS4wLCBhbmQgTmV0c2NhcGUgNi4yIGlnbm9yZSBzaGFkb3dlZCBub24tZW51bWVyYWJsZVxuICAgICAgICAgIC8vIHByb3BlcnRpZXMuXG4gICAgICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgaXNGdW5jdGlvbiA9IGdldENsYXNzLmNhbGwob2JqZWN0KSA9PSBmdW5jdGlvbkNsYXNzLCBwcm9wZXJ0eSwgbGVuZ3RoO1xuICAgICAgICAgICAgdmFyIGhhc1Byb3BlcnR5ID0gIWlzRnVuY3Rpb24gJiYgdHlwZW9mIG9iamVjdC5jb25zdHJ1Y3RvciAhPSBcImZ1bmN0aW9uXCIgJiYgb2JqZWN0VHlwZXNbdHlwZW9mIG9iamVjdC5oYXNPd25Qcm9wZXJ0eV0gJiYgb2JqZWN0Lmhhc093blByb3BlcnR5IHx8IGlzUHJvcGVydHk7XG4gICAgICAgICAgICBmb3IgKHByb3BlcnR5IGluIG9iamVjdCkge1xuICAgICAgICAgICAgICAvLyBHZWNrbyA8PSAxLjAgZW51bWVyYXRlcyB0aGUgYHByb3RvdHlwZWAgcHJvcGVydHkgb2YgZnVuY3Rpb25zIHVuZGVyXG4gICAgICAgICAgICAgIC8vIGNlcnRhaW4gY29uZGl0aW9uczsgSUUgZG9lcyBub3QuXG4gICAgICAgICAgICAgIGlmICghKGlzRnVuY3Rpb24gJiYgcHJvcGVydHkgPT0gXCJwcm90b3R5cGVcIikgJiYgaGFzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTWFudWFsbHkgaW52b2tlIHRoZSBjYWxsYmFjayBmb3IgZWFjaCBub24tZW51bWVyYWJsZSBwcm9wZXJ0eS5cbiAgICAgICAgICAgIGZvciAobGVuZ3RoID0gbWVtYmVycy5sZW5ndGg7IHByb3BlcnR5ID0gbWVtYmVyc1stLWxlbmd0aF07IGhhc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkgJiYgY2FsbGJhY2socHJvcGVydHkpKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKHNpemUgPT0gMikge1xuICAgICAgICAgIC8vIFNhZmFyaSA8PSAyLjAuNCBlbnVtZXJhdGVzIHNoYWRvd2VkIHByb3BlcnRpZXMgdHdpY2UuXG4gICAgICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgYSBzZXQgb2YgaXRlcmF0ZWQgcHJvcGVydGllcy5cbiAgICAgICAgICAgIHZhciBtZW1iZXJzID0ge30sIGlzRnVuY3Rpb24gPSBnZXRDbGFzcy5jYWxsKG9iamVjdCkgPT0gZnVuY3Rpb25DbGFzcywgcHJvcGVydHk7XG4gICAgICAgICAgICBmb3IgKHByb3BlcnR5IGluIG9iamVjdCkge1xuICAgICAgICAgICAgICAvLyBTdG9yZSBlYWNoIHByb3BlcnR5IG5hbWUgdG8gcHJldmVudCBkb3VibGUgZW51bWVyYXRpb24uIFRoZVxuICAgICAgICAgICAgICAvLyBgcHJvdG90eXBlYCBwcm9wZXJ0eSBvZiBmdW5jdGlvbnMgaXMgbm90IGVudW1lcmF0ZWQgZHVlIHRvIGNyb3NzLVxuICAgICAgICAgICAgICAvLyBlbnZpcm9ubWVudCBpbmNvbnNpc3RlbmNpZXMuXG4gICAgICAgICAgICAgIGlmICghKGlzRnVuY3Rpb24gJiYgcHJvcGVydHkgPT0gXCJwcm90b3R5cGVcIikgJiYgIWlzUHJvcGVydHkuY2FsbChtZW1iZXJzLCBwcm9wZXJ0eSkgJiYgKG1lbWJlcnNbcHJvcGVydHldID0gMSkgJiYgaXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBObyBidWdzIGRldGVjdGVkOyB1c2UgdGhlIHN0YW5kYXJkIGBmb3IuLi5pbmAgYWxnb3JpdGhtLlxuICAgICAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIGlzRnVuY3Rpb24gPSBnZXRDbGFzcy5jYWxsKG9iamVjdCkgPT0gZnVuY3Rpb25DbGFzcywgcHJvcGVydHksIGlzQ29uc3RydWN0b3I7XG4gICAgICAgICAgICBmb3IgKHByb3BlcnR5IGluIG9iamVjdCkge1xuICAgICAgICAgICAgICBpZiAoIShpc0Z1bmN0aW9uICYmIHByb3BlcnR5ID09IFwicHJvdG90eXBlXCIpICYmIGlzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSAmJiAhKGlzQ29uc3RydWN0b3IgPSBwcm9wZXJ0eSA9PT0gXCJjb25zdHJ1Y3RvclwiKSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTWFudWFsbHkgaW52b2tlIHRoZSBjYWxsYmFjayBmb3IgdGhlIGBjb25zdHJ1Y3RvcmAgcHJvcGVydHkgZHVlIHRvXG4gICAgICAgICAgICAvLyBjcm9zcy1lbnZpcm9ubWVudCBpbmNvbnNpc3RlbmNpZXMuXG4gICAgICAgICAgICBpZiAoaXNDb25zdHJ1Y3RvciB8fCBpc1Byb3BlcnR5LmNhbGwob2JqZWN0LCAocHJvcGVydHkgPSBcImNvbnN0cnVjdG9yXCIpKSkge1xuICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZm9yRWFjaChvYmplY3QsIGNhbGxiYWNrKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIFB1YmxpYzogU2VyaWFsaXplcyBhIEphdmFTY3JpcHQgYHZhbHVlYCBhcyBhIEpTT04gc3RyaW5nLiBUaGUgb3B0aW9uYWxcbiAgICAgIC8vIGBmaWx0ZXJgIGFyZ3VtZW50IG1heSBzcGVjaWZ5IGVpdGhlciBhIGZ1bmN0aW9uIHRoYXQgYWx0ZXJzIGhvdyBvYmplY3QgYW5kXG4gICAgICAvLyBhcnJheSBtZW1iZXJzIGFyZSBzZXJpYWxpemVkLCBvciBhbiBhcnJheSBvZiBzdHJpbmdzIGFuZCBudW1iZXJzIHRoYXRcbiAgICAgIC8vIGluZGljYXRlcyB3aGljaCBwcm9wZXJ0aWVzIHNob3VsZCBiZSBzZXJpYWxpemVkLiBUaGUgb3B0aW9uYWwgYHdpZHRoYFxuICAgICAgLy8gYXJndW1lbnQgbWF5IGJlIGVpdGhlciBhIHN0cmluZyBvciBudW1iZXIgdGhhdCBzcGVjaWZpZXMgdGhlIGluZGVudGF0aW9uXG4gICAgICAvLyBsZXZlbCBvZiB0aGUgb3V0cHV0LlxuICAgICAgaWYgKHRydWUpIHtcbiAgICAgICAgLy8gSW50ZXJuYWw6IEEgbWFwIG9mIGNvbnRyb2wgY2hhcmFjdGVycyBhbmQgdGhlaXIgZXNjYXBlZCBlcXVpdmFsZW50cy5cbiAgICAgICAgdmFyIEVzY2FwZXMgPSB7XG4gICAgICAgICAgOTI6IFwiXFxcXFxcXFxcIixcbiAgICAgICAgICAzNDogJ1xcXFxcIicsXG4gICAgICAgICAgODogXCJcXFxcYlwiLFxuICAgICAgICAgIDEyOiBcIlxcXFxmXCIsXG4gICAgICAgICAgMTA6IFwiXFxcXG5cIixcbiAgICAgICAgICAxMzogXCJcXFxcclwiLFxuICAgICAgICAgIDk6IFwiXFxcXHRcIlxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBDb252ZXJ0cyBgdmFsdWVgIGludG8gYSB6ZXJvLXBhZGRlZCBzdHJpbmcgc3VjaCB0aGF0IGl0c1xuICAgICAgICAvLyBsZW5ndGggaXMgYXQgbGVhc3QgZXF1YWwgdG8gYHdpZHRoYC4gVGhlIGB3aWR0aGAgbXVzdCBiZSA8PSA2LlxuICAgICAgICB2YXIgbGVhZGluZ1plcm9lcyA9IFwiMDAwMDAwXCI7XG4gICAgICAgIHZhciB0b1BhZGRlZFN0cmluZyA9IGZ1bmN0aW9uICh3aWR0aCwgdmFsdWUpIHtcbiAgICAgICAgICAvLyBUaGUgYHx8IDBgIGV4cHJlc3Npb24gaXMgbmVjZXNzYXJ5IHRvIHdvcmsgYXJvdW5kIGEgYnVnIGluXG4gICAgICAgICAgLy8gT3BlcmEgPD0gNy41NHUyIHdoZXJlIGAwID09IC0wYCwgYnV0IGBTdHJpbmcoLTApICE9PSBcIjBcImAuXG4gICAgICAgICAgcmV0dXJuIChsZWFkaW5nWmVyb2VzICsgKHZhbHVlIHx8IDApKS5zbGljZSgtd2lkdGgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBEb3VibGUtcXVvdGVzIGEgc3RyaW5nIGB2YWx1ZWAsIHJlcGxhY2luZyBhbGwgQVNDSUkgY29udHJvbFxuICAgICAgICAvLyBjaGFyYWN0ZXJzIChjaGFyYWN0ZXJzIHdpdGggY29kZSB1bml0IHZhbHVlcyBiZXR3ZWVuIDAgYW5kIDMxKSB3aXRoXG4gICAgICAgIC8vIHRoZWlyIGVzY2FwZWQgZXF1aXZhbGVudHMuIFRoaXMgaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgdGhlXG4gICAgICAgIC8vIGBRdW90ZSh2YWx1ZSlgIG9wZXJhdGlvbiBkZWZpbmVkIGluIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMuXG4gICAgICAgIHZhciB1bmljb2RlUHJlZml4ID0gXCJcXFxcdTAwXCI7XG4gICAgICAgIHZhciBxdW90ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgIHZhciByZXN1bHQgPSAnXCInLCBpbmRleCA9IDAsIGxlbmd0aCA9IHZhbHVlLmxlbmd0aCwgdXNlQ2hhckluZGV4ID0gIWNoYXJJbmRleEJ1Z2d5IHx8IGxlbmd0aCA+IDEwO1xuICAgICAgICAgIHZhciBzeW1ib2xzID0gdXNlQ2hhckluZGV4ICYmIChjaGFySW5kZXhCdWdneSA/IHZhbHVlLnNwbGl0KFwiXCIpIDogdmFsdWUpO1xuICAgICAgICAgIGZvciAoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgdmFyIGNoYXJDb2RlID0gdmFsdWUuY2hhckNvZGVBdChpbmRleCk7XG4gICAgICAgICAgICAvLyBJZiB0aGUgY2hhcmFjdGVyIGlzIGEgY29udHJvbCBjaGFyYWN0ZXIsIGFwcGVuZCBpdHMgVW5pY29kZSBvclxuICAgICAgICAgICAgLy8gc2hvcnRoYW5kIGVzY2FwZSBzZXF1ZW5jZTsgb3RoZXJ3aXNlLCBhcHBlbmQgdGhlIGNoYXJhY3RlciBhcy1pcy5cbiAgICAgICAgICAgIHN3aXRjaCAoY2hhckNvZGUpIHtcbiAgICAgICAgICAgICAgY2FzZSA4OiBjYXNlIDk6IGNhc2UgMTA6IGNhc2UgMTI6IGNhc2UgMTM6IGNhc2UgMzQ6IGNhc2UgOTI6XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IEVzY2FwZXNbY2hhckNvZGVdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA8IDMyKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQgKz0gdW5pY29kZVByZWZpeCArIHRvUGFkZGVkU3RyaW5nKDIsIGNoYXJDb2RlLnRvU3RyaW5nKDE2KSk7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IHVzZUNoYXJJbmRleCA/IHN5bWJvbHNbaW5kZXhdIDogdmFsdWUuY2hhckF0KGluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdCArICdcIic7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZXMgYW4gb2JqZWN0LiBJbXBsZW1lbnRzIHRoZVxuICAgICAgICAvLyBgU3RyKGtleSwgaG9sZGVyKWAsIGBKTyh2YWx1ZSlgLCBhbmQgYEpBKHZhbHVlKWAgb3BlcmF0aW9ucy5cbiAgICAgICAgdmFyIHNlcmlhbGl6ZSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSwgb2JqZWN0LCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgaW5kZW50YXRpb24sIHN0YWNrLCBtYXhMaW5lTGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIHZhbHVlLCBjbGFzc05hbWUsIHllYXIsIG1vbnRoLCBkYXRlLCB0aW1lLCBob3VycywgbWludXRlcywgc2Vjb25kcywgbWlsbGlzZWNvbmRzLCByZXN1bHRzLCBlbGVtZW50LCBpbmRleCwgbGVuZ3RoLCBwcmVmaXgsIHJlc3VsdDtcblxuICAgICAgICAgIG1heExpbmVMZW5ndGggPSBtYXhMaW5lTGVuZ3RoIHx8IDA7XG5cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gTmVjZXNzYXJ5IGZvciBob3N0IG9iamVjdCBzdXBwb3J0LlxuICAgICAgICAgICAgdmFsdWUgPSBvYmplY3RbcHJvcGVydHldO1xuICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIgJiYgdmFsdWUpIHtcbiAgICAgICAgICAgIGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwodmFsdWUpO1xuICAgICAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBkYXRlQ2xhc3MgJiYgIWlzUHJvcGVydHkuY2FsbCh2YWx1ZSwgXCJ0b0pTT05cIikpIHtcbiAgICAgICAgICAgICAgaWYgKHZhbHVlID4gLTEgLyAwICYmIHZhbHVlIDwgMSAvIDApIHtcbiAgICAgICAgICAgICAgICAvLyBEYXRlcyBhcmUgc2VyaWFsaXplZCBhY2NvcmRpbmcgdG8gdGhlIGBEYXRlI3RvSlNPTmAgbWV0aG9kXG4gICAgICAgICAgICAgICAgLy8gc3BlY2lmaWVkIGluIEVTIDUuMSBzZWN0aW9uIDE1LjkuNS40NC4gU2VlIHNlY3Rpb24gMTUuOS4xLjE1XG4gICAgICAgICAgICAgICAgLy8gZm9yIHRoZSBJU08gODYwMSBkYXRlIHRpbWUgc3RyaW5nIGZvcm1hdC5cbiAgICAgICAgICAgICAgICBpZiAoZ2V0RGF5KSB7XG4gICAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBjb21wdXRlIHRoZSB5ZWFyLCBtb250aCwgZGF0ZSwgaG91cnMsIG1pbnV0ZXMsXG4gICAgICAgICAgICAgICAgICAvLyBzZWNvbmRzLCBhbmQgbWlsbGlzZWNvbmRzIGlmIHRoZSBgZ2V0VVRDKmAgbWV0aG9kcyBhcmVcbiAgICAgICAgICAgICAgICAgIC8vIGJ1Z2d5LiBBZGFwdGVkIGZyb20gQFlhZmZsZSdzIGBkYXRlLXNoaW1gIHByb2plY3QuXG4gICAgICAgICAgICAgICAgICBkYXRlID0gZmxvb3IodmFsdWUgLyA4NjRlNSk7XG4gICAgICAgICAgICAgICAgICBmb3IgKHllYXIgPSBmbG9vcihkYXRlIC8gMzY1LjI0MjUpICsgMTk3MCAtIDE7IGdldERheSh5ZWFyICsgMSwgMCkgPD0gZGF0ZTsgeWVhcisrKTtcbiAgICAgICAgICAgICAgICAgIGZvciAobW9udGggPSBmbG9vcigoZGF0ZSAtIGdldERheSh5ZWFyLCAwKSkgLyAzMC40Mik7IGdldERheSh5ZWFyLCBtb250aCArIDEpIDw9IGRhdGU7IG1vbnRoKyspO1xuICAgICAgICAgICAgICAgICAgZGF0ZSA9IDEgKyBkYXRlIC0gZ2V0RGF5KHllYXIsIG1vbnRoKTtcbiAgICAgICAgICAgICAgICAgIC8vIFRoZSBgdGltZWAgdmFsdWUgc3BlY2lmaWVzIHRoZSB0aW1lIHdpdGhpbiB0aGUgZGF5IChzZWUgRVNcbiAgICAgICAgICAgICAgICAgIC8vIDUuMSBzZWN0aW9uIDE1LjkuMS4yKS4gVGhlIGZvcm11bGEgYChBICUgQiArIEIpICUgQmAgaXMgdXNlZFxuICAgICAgICAgICAgICAgICAgLy8gdG8gY29tcHV0ZSBgQSBtb2R1bG8gQmAsIGFzIHRoZSBgJWAgb3BlcmF0b3IgZG9lcyBub3RcbiAgICAgICAgICAgICAgICAgIC8vIGNvcnJlc3BvbmQgdG8gdGhlIGBtb2R1bG9gIG9wZXJhdGlvbiBmb3IgbmVnYXRpdmUgbnVtYmVycy5cbiAgICAgICAgICAgICAgICAgIHRpbWUgPSAodmFsdWUgJSA4NjRlNSArIDg2NGU1KSAlIDg2NGU1O1xuICAgICAgICAgICAgICAgICAgLy8gVGhlIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBhbmQgbWlsbGlzZWNvbmRzIGFyZSBvYnRhaW5lZCBieVxuICAgICAgICAgICAgICAgICAgLy8gZGVjb21wb3NpbmcgdGhlIHRpbWUgd2l0aGluIHRoZSBkYXkuIFNlZSBzZWN0aW9uIDE1LjkuMS4xMC5cbiAgICAgICAgICAgICAgICAgIGhvdXJzID0gZmxvb3IodGltZSAvIDM2ZTUpICUgMjQ7XG4gICAgICAgICAgICAgICAgICBtaW51dGVzID0gZmxvb3IodGltZSAvIDZlNCkgJSA2MDtcbiAgICAgICAgICAgICAgICAgIHNlY29uZHMgPSBmbG9vcih0aW1lIC8gMWUzKSAlIDYwO1xuICAgICAgICAgICAgICAgICAgbWlsbGlzZWNvbmRzID0gdGltZSAlIDFlMztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgeWVhciA9IHZhbHVlLmdldFVUQ0Z1bGxZZWFyKCk7XG4gICAgICAgICAgICAgICAgICBtb250aCA9IHZhbHVlLmdldFVUQ01vbnRoKCk7XG4gICAgICAgICAgICAgICAgICBkYXRlID0gdmFsdWUuZ2V0VVRDRGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgaG91cnMgPSB2YWx1ZS5nZXRVVENIb3VycygpO1xuICAgICAgICAgICAgICAgICAgbWludXRlcyA9IHZhbHVlLmdldFVUQ01pbnV0ZXMoKTtcbiAgICAgICAgICAgICAgICAgIHNlY29uZHMgPSB2YWx1ZS5nZXRVVENTZWNvbmRzKCk7XG4gICAgICAgICAgICAgICAgICBtaWxsaXNlY29uZHMgPSB2YWx1ZS5nZXRVVENNaWxsaXNlY29uZHMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gU2VyaWFsaXplIGV4dGVuZGVkIHllYXJzIGNvcnJlY3RseS5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9ICh5ZWFyIDw9IDAgfHwgeWVhciA+PSAxZTQgPyAoeWVhciA8IDAgPyBcIi1cIiA6IFwiK1wiKSArIHRvUGFkZGVkU3RyaW5nKDYsIHllYXIgPCAwID8gLXllYXIgOiB5ZWFyKSA6IHRvUGFkZGVkU3RyaW5nKDQsIHllYXIpKSArXG4gICAgICAgICAgICAgICAgICBcIi1cIiArIHRvUGFkZGVkU3RyaW5nKDIsIG1vbnRoICsgMSkgKyBcIi1cIiArIHRvUGFkZGVkU3RyaW5nKDIsIGRhdGUpICtcbiAgICAgICAgICAgICAgICAgIC8vIE1vbnRocywgZGF0ZXMsIGhvdXJzLCBtaW51dGVzLCBhbmQgc2Vjb25kcyBzaG91bGQgaGF2ZSB0d29cbiAgICAgICAgICAgICAgICAgIC8vIGRpZ2l0czsgbWlsbGlzZWNvbmRzIHNob3VsZCBoYXZlIHRocmVlLlxuICAgICAgICAgICAgICAgICAgXCJUXCIgKyB0b1BhZGRlZFN0cmluZygyLCBob3VycykgKyBcIjpcIiArIHRvUGFkZGVkU3RyaW5nKDIsIG1pbnV0ZXMpICsgXCI6XCIgKyB0b1BhZGRlZFN0cmluZygyLCBzZWNvbmRzKSArXG4gICAgICAgICAgICAgICAgICAvLyBNaWxsaXNlY29uZHMgYXJlIG9wdGlvbmFsIGluIEVTIDUuMCwgYnV0IHJlcXVpcmVkIGluIDUuMS5cbiAgICAgICAgICAgICAgICAgIFwiLlwiICsgdG9QYWRkZWRTdHJpbmcoMywgbWlsbGlzZWNvbmRzKSArIFwiWlwiO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUudG9KU09OID09IFwiZnVuY3Rpb25cIiAmJiAoKGNsYXNzTmFtZSAhPSBudW1iZXJDbGFzcyAmJiBjbGFzc05hbWUgIT0gc3RyaW5nQ2xhc3MgJiYgY2xhc3NOYW1lICE9IGFycmF5Q2xhc3MpIHx8IGlzUHJvcGVydHkuY2FsbCh2YWx1ZSwgXCJ0b0pTT05cIikpKSB7XG4gICAgICAgICAgICAgIC8vIFByb3RvdHlwZSA8PSAxLjYuMSBhZGRzIG5vbi1zdGFuZGFyZCBgdG9KU09OYCBtZXRob2RzIHRvIHRoZVxuICAgICAgICAgICAgICAvLyBgTnVtYmVyYCwgYFN0cmluZ2AsIGBEYXRlYCwgYW5kIGBBcnJheWAgcHJvdG90eXBlcy4gSlNPTiAzXG4gICAgICAgICAgICAgIC8vIGlnbm9yZXMgYWxsIGB0b0pTT05gIG1ldGhvZHMgb24gdGhlc2Ugb2JqZWN0cyB1bmxlc3MgdGhleSBhcmVcbiAgICAgICAgICAgICAgLy8gZGVmaW5lZCBkaXJlY3RseSBvbiBhbiBpbnN0YW5jZS5cbiAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS50b0pTT04ocHJvcGVydHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIElmIGEgcmVwbGFjZW1lbnQgZnVuY3Rpb24gd2FzIHByb3ZpZGVkLCBjYWxsIGl0IHRvIG9idGFpbiB0aGUgdmFsdWVcbiAgICAgICAgICAgIC8vIGZvciBzZXJpYWxpemF0aW9uLlxuICAgICAgICAgICAgdmFsdWUgPSBjYWxsYmFjay5jYWxsKG9iamVjdCwgcHJvcGVydHksIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJudWxsXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwodmFsdWUpO1xuICAgICAgICAgIGlmIChjbGFzc05hbWUgPT0gYm9vbGVhbkNsYXNzKSB7XG4gICAgICAgICAgICAvLyBCb29sZWFucyBhcmUgcmVwcmVzZW50ZWQgbGl0ZXJhbGx5LlxuICAgICAgICAgICAgcmV0dXJuIFwiXCIgKyB2YWx1ZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBudW1iZXJDbGFzcykge1xuICAgICAgICAgICAgLy8gSlNPTiBudW1iZXJzIG11c3QgYmUgZmluaXRlLiBgSW5maW5pdHlgIGFuZCBgTmFOYCBhcmUgc2VyaWFsaXplZCBhc1xuICAgICAgICAgICAgLy8gYFwibnVsbFwiYC5cbiAgICAgICAgICAgIHJldHVybiB2YWx1ZSA+IC0xIC8gMCAmJiB2YWx1ZSA8IDEgLyAwID8gXCJcIiArIHZhbHVlIDogXCJudWxsXCI7XG4gICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MpIHtcbiAgICAgICAgICAgIC8vIFN0cmluZ3MgYXJlIGRvdWJsZS1xdW90ZWQgYW5kIGVzY2FwZWQuXG4gICAgICAgICAgICByZXR1cm4gcXVvdGUoXCJcIiArIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmVjdXJzaXZlbHkgc2VyaWFsaXplIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBjeWNsaWMgc3RydWN0dXJlcy4gVGhpcyBpcyBhIGxpbmVhciBzZWFyY2g7IHBlcmZvcm1hbmNlXG4gICAgICAgICAgICAvLyBpcyBpbnZlcnNlbHkgcHJvcG9ydGlvbmFsIHRvIHRoZSBudW1iZXIgb2YgdW5pcXVlIG5lc3RlZCBvYmplY3RzLlxuICAgICAgICAgICAgZm9yIChsZW5ndGggPSBzdGFjay5sZW5ndGg7IGxlbmd0aC0tOykge1xuICAgICAgICAgICAgICBpZiAoc3RhY2tbbGVuZ3RoXSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDeWNsaWMgc3RydWN0dXJlcyBjYW5ub3QgYmUgc2VyaWFsaXplZCBieSBgSlNPTi5zdHJpbmdpZnlgLlxuICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBZGQgdGhlIG9iamVjdCB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgICAgICAgICBzdGFjay5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgICAgIC8vIFNhdmUgdGhlIGN1cnJlbnQgaW5kZW50YXRpb24gbGV2ZWwgYW5kIGluZGVudCBvbmUgYWRkaXRpb25hbCBsZXZlbC5cbiAgICAgICAgICAgIHByZWZpeCA9IGluZGVudGF0aW9uO1xuICAgICAgICAgICAgaW5kZW50YXRpb24gKz0gd2hpdGVzcGFjZTtcbiAgICAgICAgICAgIGlmIChjbGFzc05hbWUgPT0gYXJyYXlDbGFzcykge1xuICAgICAgICAgICAgICB2YXIgdG90YWxMZW5ndGggPSBpbmRlbnRhdGlvbi5sZW5ndGgsIHJlc3VsdDtcbiAgICAgICAgICAgICAgLy8gUmVjdXJzaXZlbHkgc2VyaWFsaXplIGFycmF5IGVsZW1lbnRzLlxuICAgICAgICAgICAgICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gdmFsdWUubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBzZXJpYWxpemUoaW5kZXgsIHZhbHVlLCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgaW5kZW50YXRpb24sXG4gICAgICAgICAgICAgICAgICBzdGFjaywgbWF4TGluZUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZWxlbWVudCA9PT0gdW5kZWYgPyBcIm51bGxcIiA6IGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgdG90YWxMZW5ndGggKz0gcmVzdWx0Lmxlbmd0aCArIChpbmRleCA+IDAgPyAxIDogMCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHJlc3VsdCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0cy5sZW5ndGggP1xuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgIHdoaXRlc3BhY2UgJiYgKHRvdGFsTGVuZ3RoID4gbWF4TGluZUxlbmd0aCkgP1xuICAgICAgICAgICAgICAgICAgXCJbXFxuXCIgKyBpbmRlbnRhdGlvbiArIHJlc3VsdHMuam9pbihcIixcXG5cIiArIGluZGVudGF0aW9uKSArIFwiXFxuXCIgKyBwcmVmaXggKyBcIl1cIiA6XG4gICAgICAgICAgICAgICAgICBcIltcIiArIHJlc3VsdHMuam9pbihcIixcIikgKyBcIl1cIlxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICA6IFwiW11cIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHZhciB0b3RhbExlbmd0aCA9IGluZGVudGF0aW9uLmxlbmd0aCwgaW5kZXg9MDtcbiAgICAgICAgICAgICAgLy8gUmVjdXJzaXZlbHkgc2VyaWFsaXplIG9iamVjdCBtZW1iZXJzLiBNZW1iZXJzIGFyZSBzZWxlY3RlZCBmcm9tXG4gICAgICAgICAgICAgIC8vIGVpdGhlciBhIHVzZXItc3BlY2lmaWVkIGxpc3Qgb2YgcHJvcGVydHkgbmFtZXMsIG9yIHRoZSBvYmplY3RcbiAgICAgICAgICAgICAgLy8gaXRzZWxmLlxuICAgICAgICAgICAgICBmb3JFYWNoKHByb3BlcnRpZXMgfHwgdmFsdWUsIGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQsIGVsZW1lbnQgPSBzZXJpYWxpemUocHJvcGVydHksIHZhbHVlLCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgaW5kZW50YXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2ssIG1heExpbmVMZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQgIT09IHVuZGVmKSB7XG4gICAgICAgICAgICAgICAgICAvLyBBY2NvcmRpbmcgdG8gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMzogXCJJZiBgZ2FwYCB7d2hpdGVzcGFjZX1cbiAgICAgICAgICAgICAgICAgIC8vIGlzIG5vdCB0aGUgZW1wdHkgc3RyaW5nLCBsZXQgYG1lbWJlcmAge3F1b3RlKHByb3BlcnR5KSArIFwiOlwifVxuICAgICAgICAgICAgICAgICAgLy8gYmUgdGhlIGNvbmNhdGVuYXRpb24gb2YgYG1lbWJlcmAgYW5kIHRoZSBgc3BhY2VgIGNoYXJhY3Rlci5cIlxuICAgICAgICAgICAgICAgICAgLy8gVGhlIFwiYHNwYWNlYCBjaGFyYWN0ZXJcIiByZWZlcnMgdG8gdGhlIGxpdGVyYWwgc3BhY2VcbiAgICAgICAgICAgICAgICAgIC8vIGNoYXJhY3Rlciwgbm90IHRoZSBgc3BhY2VgIHt3aWR0aH0gYXJndW1lbnQgcHJvdmlkZWQgdG9cbiAgICAgICAgICAgICAgICAgIC8vIGBKU09OLnN0cmluZ2lmeWAuXG4gICAgICAgICAgICAgICAgICByZXN1bHQgPSBxdW90ZShwcm9wZXJ0eSkgKyBcIjpcIiArICh3aGl0ZXNwYWNlID8gXCIgXCIgOiBcIlwiKSArIGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICB0b3RhbExlbmd0aCArPSByZXN1bHQubGVuZ3RoICsgKGluZGV4KysgPiAwID8gMSA6IDApO1xuICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0cy5sZW5ndGggP1xuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgIHdoaXRlc3BhY2UgJiYgKHRvdGFsTGVuZ3RoID4gbWF4TGluZUxlbmd0aCkgP1xuICAgICAgICAgICAgICAgICAgXCJ7XFxuXCIgKyBpbmRlbnRhdGlvbiArIHJlc3VsdHMuam9pbihcIixcXG5cIiArIGluZGVudGF0aW9uKSArIFwiXFxuXCIgKyBwcmVmaXggKyBcIn1cIiA6XG4gICAgICAgICAgICAgICAgICBcIntcIiArIHJlc3VsdHMuam9pbihcIixcIikgKyBcIn1cIlxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICA6IFwie31cIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgb2JqZWN0IGZyb20gdGhlIHRyYXZlcnNlZCBvYmplY3Qgc3RhY2suXG4gICAgICAgICAgICBzdGFjay5wb3AoKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFB1YmxpYzogYEpTT04uc3RyaW5naWZ5YC4gU2VlIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMuXG5cbiAgICAgICAgZXhwb3J0cy5zdHJpbmdpZnkgPSBmdW5jdGlvbiAoc291cmNlLCBmaWx0ZXIsIHdpZHRoLCBtYXhMaW5lTGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIHdoaXRlc3BhY2UsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCBjbGFzc05hbWU7XG4gICAgICAgICAgaWYgKG9iamVjdFR5cGVzW3R5cGVvZiBmaWx0ZXJdICYmIGZpbHRlcikge1xuICAgICAgICAgICAgaWYgKChjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKGZpbHRlcikpID09IGZ1bmN0aW9uQ2xhc3MpIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmaWx0ZXI7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBhcnJheUNsYXNzKSB7XG4gICAgICAgICAgICAgIC8vIENvbnZlcnQgdGhlIHByb3BlcnR5IG5hbWVzIGFycmF5IGludG8gYSBtYWtlc2hpZnQgc2V0LlxuICAgICAgICAgICAgICBwcm9wZXJ0aWVzID0ge307XG4gICAgICAgICAgICAgIGZvciAodmFyIGluZGV4ID0gMCwgbGVuZ3RoID0gZmlsdGVyLmxlbmd0aCwgdmFsdWU7IGluZGV4IDwgbGVuZ3RoOyB2YWx1ZSA9IGZpbHRlcltpbmRleCsrXSwgKChjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKHZhbHVlKSksIGNsYXNzTmFtZSA9PSBzdHJpbmdDbGFzcyB8fCBjbGFzc05hbWUgPT0gbnVtYmVyQ2xhc3MpICYmIChwcm9wZXJ0aWVzW3ZhbHVlXSA9IDEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHdpZHRoKSB7XG4gICAgICAgICAgICBpZiAoKGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwod2lkdGgpKSA9PSBudW1iZXJDbGFzcykge1xuICAgICAgICAgICAgICAvLyBDb252ZXJ0IHRoZSBgd2lkdGhgIHRvIGFuIGludGVnZXIgYW5kIGNyZWF0ZSBhIHN0cmluZyBjb250YWluaW5nXG4gICAgICAgICAgICAgIC8vIGB3aWR0aGAgbnVtYmVyIG9mIHNwYWNlIGNoYXJhY3RlcnMuXG4gICAgICAgICAgICAgIGlmICgod2lkdGggLT0gd2lkdGggJSAxKSA+IDApIHtcbiAgICAgICAgICAgICAgICBmb3IgKHdoaXRlc3BhY2UgPSBcIlwiLCB3aWR0aCA+IDEwICYmICh3aWR0aCA9IDEwKTsgd2hpdGVzcGFjZS5sZW5ndGggPCB3aWR0aDsgd2hpdGVzcGFjZSArPSBcIiBcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IHN0cmluZ0NsYXNzKSB7XG4gICAgICAgICAgICAgIHdoaXRlc3BhY2UgPSB3aWR0aC5sZW5ndGggPD0gMTAgPyB3aWR0aCA6IHdpZHRoLnNsaWNlKDAsIDEwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gT3BlcmEgPD0gNy41NHUyIGRpc2NhcmRzIHRoZSB2YWx1ZXMgYXNzb2NpYXRlZCB3aXRoIGVtcHR5IHN0cmluZyBrZXlzXG4gICAgICAgICAgLy8gKGBcIlwiYCkgb25seSBpZiB0aGV5IGFyZSB1c2VkIGRpcmVjdGx5IHdpdGhpbiBhbiBvYmplY3QgbWVtYmVyIGxpc3RcbiAgICAgICAgICAvLyAoZS5nLiwgYCEoXCJcIiBpbiB7IFwiXCI6IDF9KWApLlxuICAgICAgICAgIHJldHVybiBzZXJpYWxpemUoXCJcIiwgKHZhbHVlID0ge30sIHZhbHVlW1wiXCJdID0gc291cmNlLCB2YWx1ZSksIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBcIlwiLCBbXSwgbWF4TGluZUxlbmd0aCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgZXhwb3J0cy5jb21wYWN0U3RyaW5naWZ5ID0gZnVuY3Rpb24gKHNvdXJjZSwgZmlsdGVyLCB3aWR0aCl7XG4gICAgICAgICAgcmV0dXJuIGV4cG9ydHMuc3RyaW5naWZ5KHNvdXJjZSwgZmlsdGVyLCB3aWR0aCwgNjApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFB1YmxpYzogUGFyc2VzIGEgSlNPTiBzb3VyY2Ugc3RyaW5nLlxuICAgICAgaWYgKCFoYXMoXCJqc29uLXBhcnNlXCIpKSB7XG4gICAgICAgIHZhciBmcm9tQ2hhckNvZGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlO1xuXG4gICAgICAgIC8vIEludGVybmFsOiBBIG1hcCBvZiBlc2NhcGVkIGNvbnRyb2wgY2hhcmFjdGVycyBhbmQgdGhlaXIgdW5lc2NhcGVkXG4gICAgICAgIC8vIGVxdWl2YWxlbnRzLlxuICAgICAgICB2YXIgVW5lc2NhcGVzID0ge1xuICAgICAgICAgIDkyOiBcIlxcXFxcIixcbiAgICAgICAgICAzNDogJ1wiJyxcbiAgICAgICAgICA0NzogXCIvXCIsXG4gICAgICAgICAgOTg6IFwiXFxiXCIsXG4gICAgICAgICAgMTE2OiBcIlxcdFwiLFxuICAgICAgICAgIDExMDogXCJcXG5cIixcbiAgICAgICAgICAxMDI6IFwiXFxmXCIsXG4gICAgICAgICAgMTE0OiBcIlxcclwiXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFN0b3JlcyB0aGUgcGFyc2VyIHN0YXRlLlxuICAgICAgICB2YXIgSW5kZXgsIFNvdXJjZTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUmVzZXRzIHRoZSBwYXJzZXIgc3RhdGUgYW5kIHRocm93cyBhIGBTeW50YXhFcnJvcmAuXG4gICAgICAgIHZhciBhYm9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBJbmRleCA9IFNvdXJjZSA9IG51bGw7XG4gICAgICAgICAgdGhyb3cgU3ludGF4RXJyb3IoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUmV0dXJucyB0aGUgbmV4dCB0b2tlbiwgb3IgYFwiJFwiYCBpZiB0aGUgcGFyc2VyIGhhcyByZWFjaGVkXG4gICAgICAgIC8vIHRoZSBlbmQgb2YgdGhlIHNvdXJjZSBzdHJpbmcuIEEgdG9rZW4gbWF5IGJlIGEgc3RyaW5nLCBudW1iZXIsIGBudWxsYFxuICAgICAgICAvLyBsaXRlcmFsLCBvciBCb29sZWFuIGxpdGVyYWwuXG4gICAgICAgIHZhciBsZXggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIHNvdXJjZSA9IFNvdXJjZSwgbGVuZ3RoID0gc291cmNlLmxlbmd0aCwgdmFsdWUsIGJlZ2luLCBwb3NpdGlvbiwgaXNTaWduZWQsIGNoYXJDb2RlO1xuICAgICAgICAgIHdoaWxlIChJbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICBzd2l0Y2ggKGNoYXJDb2RlKSB7XG4gICAgICAgICAgICAgIGNhc2UgOTogY2FzZSAxMDogY2FzZSAxMzogY2FzZSAzMjpcbiAgICAgICAgICAgICAgICAvLyBTa2lwIHdoaXRlc3BhY2UgdG9rZW5zLCBpbmNsdWRpbmcgdGFicywgY2FycmlhZ2UgcmV0dXJucywgbGluZVxuICAgICAgICAgICAgICAgIC8vIGZlZWRzLCBhbmQgc3BhY2UgY2hhcmFjdGVycy5cbiAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlIDEyMzogY2FzZSAxMjU6IGNhc2UgOTE6IGNhc2UgOTM6IGNhc2UgNTg6IGNhc2UgNDQ6XG4gICAgICAgICAgICAgICAgLy8gUGFyc2UgYSBwdW5jdHVhdG9yIHRva2VuIChge2AsIGB9YCwgYFtgLCBgXWAsIGA6YCwgb3IgYCxgKSBhdFxuICAgICAgICAgICAgICAgIC8vIHRoZSBjdXJyZW50IHBvc2l0aW9uLlxuICAgICAgICAgICAgICAgIHZhbHVlID0gY2hhckluZGV4QnVnZ3kgPyBzb3VyY2UuY2hhckF0KEluZGV4KSA6IHNvdXJjZVtJbmRleF07XG4gICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICAgIGNhc2UgMzQ6XG4gICAgICAgICAgICAgICAgLy8gYFwiYCBkZWxpbWl0cyBhIEpTT04gc3RyaW5nOyBhZHZhbmNlIHRvIHRoZSBuZXh0IGNoYXJhY3RlciBhbmRcbiAgICAgICAgICAgICAgICAvLyBiZWdpbiBwYXJzaW5nIHRoZSBzdHJpbmcuIFN0cmluZyB0b2tlbnMgYXJlIHByZWZpeGVkIHdpdGggdGhlXG4gICAgICAgICAgICAgICAgLy8gc2VudGluZWwgYEBgIGNoYXJhY3RlciB0byBkaXN0aW5ndWlzaCB0aGVtIGZyb20gcHVuY3R1YXRvcnMgYW5kXG4gICAgICAgICAgICAgICAgLy8gZW5kLW9mLXN0cmluZyB0b2tlbnMuXG4gICAgICAgICAgICAgICAgZm9yICh2YWx1ZSA9IFwiQFwiLCBJbmRleCsrOyBJbmRleCA8IGxlbmd0aDspIHtcbiAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlIDwgMzIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVW5lc2NhcGVkIEFTQ0lJIGNvbnRyb2wgY2hhcmFjdGVycyAodGhvc2Ugd2l0aCBhIGNvZGUgdW5pdFxuICAgICAgICAgICAgICAgICAgICAvLyBsZXNzIHRoYW4gdGhlIHNwYWNlIGNoYXJhY3RlcikgYXJlIG5vdCBwZXJtaXR0ZWQuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoYXJDb2RlID09IDkyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEEgcmV2ZXJzZSBzb2xpZHVzIChgXFxgKSBtYXJrcyB0aGUgYmVnaW5uaW5nIG9mIGFuIGVzY2FwZWRcbiAgICAgICAgICAgICAgICAgICAgLy8gY29udHJvbCBjaGFyYWN0ZXIgKGluY2x1ZGluZyBgXCJgLCBgXFxgLCBhbmQgYC9gKSBvciBVbmljb2RlXG4gICAgICAgICAgICAgICAgICAgIC8vIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdCgrK0luZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChjaGFyQ29kZSkge1xuICAgICAgICAgICAgICAgICAgICAgIGNhc2UgOTI6IGNhc2UgMzQ6IGNhc2UgNDc6IGNhc2UgOTg6IGNhc2UgMTE2OiBjYXNlIDExMDogY2FzZSAxMDI6IGNhc2UgMTE0OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmV2aXZlIGVzY2FwZWQgY29udHJvbCBjaGFyYWN0ZXJzLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gVW5lc2NhcGVzW2NoYXJDb2RlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICBjYXNlIDExNzpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGBcXHVgIG1hcmtzIHRoZSBiZWdpbm5pbmcgb2YgYSBVbmljb2RlIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkdmFuY2UgdG8gdGhlIGZpcnN0IGNoYXJhY3RlciBhbmQgdmFsaWRhdGUgdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBmb3VyLWRpZ2l0IGNvZGUgcG9pbnQuXG4gICAgICAgICAgICAgICAgICAgICAgICBiZWdpbiA9ICsrSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHBvc2l0aW9uID0gSW5kZXggKyA0OyBJbmRleCA8IHBvc2l0aW9uOyBJbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBIHZhbGlkIHNlcXVlbmNlIGNvbXByaXNlcyBmb3VyIGhleGRpZ2l0cyAoY2FzZS1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW5zZW5zaXRpdmUpIHRoYXQgZm9ybSBhIHNpbmdsZSBoZXhhZGVjaW1hbCB2YWx1ZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEoY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcgfHwgY2hhckNvZGUgPj0gOTcgJiYgY2hhckNvZGUgPD0gMTAyIHx8IGNoYXJDb2RlID49IDY1ICYmIGNoYXJDb2RlIDw9IDcwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEludmFsaWQgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmV2aXZlIHRoZSBlc2NhcGVkIGNoYXJhY3Rlci5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICs9IGZyb21DaGFyQ29kZShcIjB4XCIgKyBzb3VyY2Uuc2xpY2UoYmVnaW4sIEluZGV4KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW52YWxpZCBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gMzQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBBbiB1bmVzY2FwZWQgZG91YmxlLXF1b3RlIGNoYXJhY3RlciBtYXJrcyB0aGUgZW5kIG9mIHRoZVxuICAgICAgICAgICAgICAgICAgICAgIC8vIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgYmVnaW4gPSBJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgLy8gT3B0aW1pemUgZm9yIHRoZSBjb21tb24gY2FzZSB3aGVyZSBhIHN0cmluZyBpcyB2YWxpZC5cbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGNoYXJDb2RlID49IDMyICYmIGNoYXJDb2RlICE9IDkyICYmIGNoYXJDb2RlICE9IDM0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdCgrK0luZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBBcHBlbmQgdGhlIHN0cmluZyBhcy1pcy5cbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gc291cmNlLnNsaWNlKGJlZ2luLCBJbmRleCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzb3VyY2UuY2hhckNvZGVBdChJbmRleCkgPT0gMzQpIHtcbiAgICAgICAgICAgICAgICAgIC8vIEFkdmFuY2UgdG8gdGhlIG5leHQgY2hhcmFjdGVyIGFuZCByZXR1cm4gdGhlIHJldml2ZWQgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVW50ZXJtaW5hdGVkIHN0cmluZy5cbiAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIFBhcnNlIG51bWJlcnMgYW5kIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIGJlZ2luID0gSW5kZXg7XG4gICAgICAgICAgICAgICAgLy8gQWR2YW5jZSBwYXN0IHRoZSBuZWdhdGl2ZSBzaWduLCBpZiBvbmUgaXMgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSA0NSkge1xuICAgICAgICAgICAgICAgICAgaXNTaWduZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdCgrK0luZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gUGFyc2UgYW4gaW50ZWdlciBvciBmbG9hdGluZy1wb2ludCB2YWx1ZS5cbiAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpIHtcbiAgICAgICAgICAgICAgICAgIC8vIExlYWRpbmcgemVyb2VzIGFyZSBpbnRlcnByZXRlZCBhcyBvY3RhbCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSA0OCAmJiAoKGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXggKyAxKSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbGxlZ2FsIG9jdGFsIGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpc1NpZ25lZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgdGhlIGludGVnZXIgY29tcG9uZW50LlxuICAgICAgICAgICAgICAgICAgZm9yICg7IEluZGV4IDwgbGVuZ3RoICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCkpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nyk7IEluZGV4KyspO1xuICAgICAgICAgICAgICAgICAgLy8gRmxvYXRzIGNhbm5vdCBjb250YWluIGEgbGVhZGluZyBkZWNpbWFsIHBvaW50OyBob3dldmVyLCB0aGlzXG4gICAgICAgICAgICAgICAgICAvLyBjYXNlIGlzIGFscmVhZHkgYWNjb3VudGVkIGZvciBieSB0aGUgcGFyc2VyLlxuICAgICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KSA9PSA0Nikge1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbiA9ICsrSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHRoZSBkZWNpbWFsIGNvbXBvbmVudC5cbiAgICAgICAgICAgICAgICAgICAgZm9yICg7IHBvc2l0aW9uIDwgbGVuZ3RoICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChwb3NpdGlvbikpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nyk7IHBvc2l0aW9uKyspO1xuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT0gSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBJbGxlZ2FsIHRyYWlsaW5nIGRlY2ltYWwuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBJbmRleCA9IHBvc2l0aW9uO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgZXhwb25lbnRzLiBUaGUgYGVgIGRlbm90aW5nIHRoZSBleHBvbmVudCBpc1xuICAgICAgICAgICAgICAgICAgLy8gY2FzZS1pbnNlbnNpdGl2ZS5cbiAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDEwMSB8fCBjaGFyQ29kZSA9PSA2OSkge1xuICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAvLyBTa2lwIHBhc3QgdGhlIHNpZ24gZm9sbG93aW5nIHRoZSBleHBvbmVudCwgaWYgb25lIGlzXG4gICAgICAgICAgICAgICAgICAgIC8vIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDQzIHx8IGNoYXJDb2RlID09IDQ1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBQYXJzZSB0aGUgZXhwb25lbnRpYWwgY29tcG9uZW50LlxuICAgICAgICAgICAgICAgICAgICBmb3IgKHBvc2l0aW9uID0gSW5kZXg7IHBvc2l0aW9uIDwgbGVuZ3RoICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChwb3NpdGlvbikpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nyk7IHBvc2l0aW9uKyspO1xuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT0gSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBJbGxlZ2FsIGVtcHR5IGV4cG9uZW50LlxuICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgSW5kZXggPSBwb3NpdGlvbjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8vIENvZXJjZSB0aGUgcGFyc2VkIHZhbHVlIHRvIGEgSmF2YVNjcmlwdCBudW1iZXIuXG4gICAgICAgICAgICAgICAgICByZXR1cm4gK3NvdXJjZS5zbGljZShiZWdpbiwgSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBBIG5lZ2F0aXZlIHNpZ24gbWF5IG9ubHkgcHJlY2VkZSBudW1iZXJzLlxuICAgICAgICAgICAgICAgIGlmIChpc1NpZ25lZCkge1xuICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gYHRydWVgLCBgZmFsc2VgLCBhbmQgYG51bGxgIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIGlmIChzb3VyY2Uuc2xpY2UoSW5kZXgsIEluZGV4ICsgNCkgPT0gXCJ0cnVlXCIpIHtcbiAgICAgICAgICAgICAgICAgIEluZGV4ICs9IDQ7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyA1KSA9PSBcImZhbHNlXCIpIHtcbiAgICAgICAgICAgICAgICAgIEluZGV4ICs9IDU7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzb3VyY2Uuc2xpY2UoSW5kZXgsIEluZGV4ICsgNCkgPT0gXCJudWxsXCIpIHtcbiAgICAgICAgICAgICAgICAgIEluZGV4ICs9IDQ7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVW5yZWNvZ25pemVkIHRva2VuLlxuICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFJldHVybiB0aGUgc2VudGluZWwgYCRgIGNoYXJhY3RlciBpZiB0aGUgcGFyc2VyIGhhcyByZWFjaGVkIHRoZSBlbmRcbiAgICAgICAgICAvLyBvZiB0aGUgc291cmNlIHN0cmluZy5cbiAgICAgICAgICByZXR1cm4gXCIkXCI7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFBhcnNlcyBhIEpTT04gYHZhbHVlYCB0b2tlbi5cbiAgICAgICAgdmFyIGdldCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgIHZhciByZXN1bHRzLCBoYXNNZW1iZXJzO1xuICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIiRcIikge1xuICAgICAgICAgICAgLy8gVW5leHBlY3RlZCBlbmQgb2YgaW5wdXQuXG4gICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGlmICgoY2hhckluZGV4QnVnZ3kgPyB2YWx1ZS5jaGFyQXQoMCkgOiB2YWx1ZVswXSkgPT0gXCJAXCIpIHtcbiAgICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBzZW50aW5lbCBgQGAgY2hhcmFjdGVyLlxuICAgICAgICAgICAgICByZXR1cm4gdmFsdWUuc2xpY2UoMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBQYXJzZSBvYmplY3QgYW5kIGFycmF5IGxpdGVyYWxzLlxuICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiW1wiKSB7XG4gICAgICAgICAgICAgIC8vIFBhcnNlcyBhIEpTT04gYXJyYXksIHJldHVybmluZyBhIG5ldyBKYXZhU2NyaXB0IGFycmF5LlxuICAgICAgICAgICAgICByZXN1bHRzID0gW107XG4gICAgICAgICAgICAgIGZvciAoOzsgaGFzTWVtYmVycyB8fCAoaGFzTWVtYmVycyA9IHRydWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAvLyBBIGNsb3Npbmcgc3F1YXJlIGJyYWNrZXQgbWFya3MgdGhlIGVuZCBvZiB0aGUgYXJyYXkgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJdXCIpIHtcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgYXJyYXkgbGl0ZXJhbCBjb250YWlucyBlbGVtZW50cywgdGhlIGN1cnJlbnQgdG9rZW5cbiAgICAgICAgICAgICAgICAvLyBzaG91bGQgYmUgYSBjb21tYSBzZXBhcmF0aW5nIHRoZSBwcmV2aW91cyBlbGVtZW50IGZyb20gdGhlXG4gICAgICAgICAgICAgICAgLy8gbmV4dC5cbiAgICAgICAgICAgICAgICBpZiAoaGFzTWVtYmVycykge1xuICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIl1cIikge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgdHJhaWxpbmcgYCxgIGluIGFycmF5IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQSBgLGAgbXVzdCBzZXBhcmF0ZSBlYWNoIGFycmF5IGVsZW1lbnQuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIEVsaXNpb25zIGFuZCBsZWFkaW5nIGNvbW1hcyBhcmUgbm90IHBlcm1pdHRlZC5cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChnZXQodmFsdWUpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPT0gXCJ7XCIpIHtcbiAgICAgICAgICAgICAgLy8gUGFyc2VzIGEgSlNPTiBvYmplY3QsIHJldHVybmluZyBhIG5ldyBKYXZhU2NyaXB0IG9iamVjdC5cbiAgICAgICAgICAgICAgcmVzdWx0cyA9IHt9O1xuICAgICAgICAgICAgICBmb3IgKDs7IGhhc01lbWJlcnMgfHwgKGhhc01lbWJlcnMgPSB0cnVlKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgLy8gQSBjbG9zaW5nIGN1cmx5IGJyYWNlIG1hcmtzIHRoZSBlbmQgb2YgdGhlIG9iamVjdCBsaXRlcmFsLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIn1cIikge1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBvYmplY3QgbGl0ZXJhbCBjb250YWlucyBtZW1iZXJzLCB0aGUgY3VycmVudCB0b2tlblxuICAgICAgICAgICAgICAgIC8vIHNob3VsZCBiZSBhIGNvbW1hIHNlcGFyYXRvci5cbiAgICAgICAgICAgICAgICBpZiAoaGFzTWVtYmVycykge1xuICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIn1cIikge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgdHJhaWxpbmcgYCxgIGluIG9iamVjdCBsaXRlcmFsLlxuICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEEgYCxgIG11c3Qgc2VwYXJhdGUgZWFjaCBvYmplY3QgbWVtYmVyLlxuICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBMZWFkaW5nIGNvbW1hcyBhcmUgbm90IHBlcm1pdHRlZCwgb2JqZWN0IHByb3BlcnR5IG5hbWVzIG11c3QgYmVcbiAgICAgICAgICAgICAgICAvLyBkb3VibGUtcXVvdGVkIHN0cmluZ3MsIGFuZCBhIGA6YCBtdXN0IHNlcGFyYXRlIGVhY2ggcHJvcGVydHlcbiAgICAgICAgICAgICAgICAvLyBuYW1lIGFuZCB2YWx1ZS5cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIgfHwgdHlwZW9mIHZhbHVlICE9IFwic3RyaW5nXCIgfHwgKGNoYXJJbmRleEJ1Z2d5ID8gdmFsdWUuY2hhckF0KDApIDogdmFsdWVbMF0pICE9IFwiQFwiIHx8IGxleCgpICE9IFwiOlwiKSB7XG4gICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHRzW3ZhbHVlLnNsaWNlKDEpXSA9IGdldChsZXgoKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBVbmV4cGVjdGVkIHRva2VuIGVuY291bnRlcmVkLlxuICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBVcGRhdGVzIGEgdHJhdmVyc2VkIG9iamVjdCBtZW1iZXIuXG4gICAgICAgIHZhciB1cGRhdGUgPSBmdW5jdGlvbiAoc291cmNlLCBwcm9wZXJ0eSwgY2FsbGJhY2spIHtcbiAgICAgICAgICB2YXIgZWxlbWVudCA9IHdhbGsoc291cmNlLCBwcm9wZXJ0eSwgY2FsbGJhY2spO1xuICAgICAgICAgIGlmIChlbGVtZW50ID09PSB1bmRlZikge1xuICAgICAgICAgICAgZGVsZXRlIHNvdXJjZVtwcm9wZXJ0eV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNvdXJjZVtwcm9wZXJ0eV0gPSBlbGVtZW50O1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUmVjdXJzaXZlbHkgdHJhdmVyc2VzIGEgcGFyc2VkIEpTT04gb2JqZWN0LCBpbnZva2luZyB0aGVcbiAgICAgICAgLy8gYGNhbGxiYWNrYCBmdW5jdGlvbiBmb3IgZWFjaCB2YWx1ZS4gVGhpcyBpcyBhbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGVcbiAgICAgICAgLy8gYFdhbGsoaG9sZGVyLCBuYW1lKWAgb3BlcmF0aW9uIGRlZmluZWQgaW4gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMi5cbiAgICAgICAgdmFyIHdhbGsgPSBmdW5jdGlvbiAoc291cmNlLCBwcm9wZXJ0eSwgY2FsbGJhY2spIHtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBzb3VyY2VbcHJvcGVydHldLCBsZW5ndGg7XG4gICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcIm9iamVjdFwiICYmIHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBgZm9yRWFjaGAgY2FuJ3QgYmUgdXNlZCB0byB0cmF2ZXJzZSBhbiBhcnJheSBpbiBPcGVyYSA8PSA4LjU0XG4gICAgICAgICAgICAvLyBiZWNhdXNlIGl0cyBgT2JqZWN0I2hhc093blByb3BlcnR5YCBpbXBsZW1lbnRhdGlvbiByZXR1cm5zIGBmYWxzZWBcbiAgICAgICAgICAgIC8vIGZvciBhcnJheSBpbmRpY2VzIChlLmcuLCBgIVsxLCAyLCAzXS5oYXNPd25Qcm9wZXJ0eShcIjBcIilgKS5cbiAgICAgICAgICAgIGlmIChnZXRDbGFzcy5jYWxsKHZhbHVlKSA9PSBhcnJheUNsYXNzKSB7XG4gICAgICAgICAgICAgIGZvciAobGVuZ3RoID0gdmFsdWUubGVuZ3RoOyBsZW5ndGgtLTspIHtcbiAgICAgICAgICAgICAgICB1cGRhdGUodmFsdWUsIGxlbmd0aCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBmb3JFYWNoKHZhbHVlLCBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGUodmFsdWUsIHByb3BlcnR5LCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2suY2FsbChzb3VyY2UsIHByb3BlcnR5LCB2YWx1ZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUHVibGljOiBgSlNPTi5wYXJzZWAuIFNlZSBFUyA1LjEgc2VjdGlvbiAxNS4xMi4yLlxuICAgICAgICBleHBvcnRzLnBhcnNlID0gZnVuY3Rpb24gKHNvdXJjZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICB2YXIgcmVzdWx0LCB2YWx1ZTtcbiAgICAgICAgICBJbmRleCA9IDA7XG4gICAgICAgICAgU291cmNlID0gXCJcIiArIHNvdXJjZTtcbiAgICAgICAgICByZXN1bHQgPSBnZXQobGV4KCkpO1xuICAgICAgICAgIC8vIElmIGEgSlNPTiBzdHJpbmcgY29udGFpbnMgbXVsdGlwbGUgdG9rZW5zLCBpdCBpcyBpbnZhbGlkLlxuICAgICAgICAgIGlmIChsZXgoKSAhPSBcIiRcIikge1xuICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmVzZXQgdGhlIHBhcnNlciBzdGF0ZS5cbiAgICAgICAgICBJbmRleCA9IFNvdXJjZSA9IG51bGw7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrICYmIGdldENsYXNzLmNhbGwoY2FsbGJhY2spID09IGZ1bmN0aW9uQ2xhc3MgPyB3YWxrKCh2YWx1ZSA9IHt9LCB2YWx1ZVtcIlwiXSA9IHJlc3VsdCwgdmFsdWUpLCBcIlwiLCBjYWxsYmFjaykgOiByZXN1bHQ7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgZXhwb3J0c1tcInJ1bkluQ29udGV4dFwiXSA9IHJ1bkluQ29udGV4dDtcbiAgICByZXR1cm4gZXhwb3J0cztcbiAgfVxuXG4gIGlmIChmcmVlRXhwb3J0cyAmJiAhaXNMb2FkZXIpIHtcbiAgICAvLyBFeHBvcnQgZm9yIENvbW1vbkpTIGVudmlyb25tZW50cy5cbiAgICBydW5JbkNvbnRleHQocm9vdCwgZnJlZUV4cG9ydHMpO1xuICB9IGVsc2Uge1xuICAgIC8vIEV4cG9ydCBmb3Igd2ViIGJyb3dzZXJzIGFuZCBKYXZhU2NyaXB0IGVuZ2luZXMuXG4gICAgdmFyIG5hdGl2ZUpTT04gPSByb290LkpTT04sXG4gICAgICAgIHByZXZpb3VzSlNPTiA9IHJvb3RbXCJKU09OM1wiXSxcbiAgICAgICAgaXNSZXN0b3JlZCA9IGZhbHNlO1xuXG4gICAgdmFyIEpTT04zID0gcnVuSW5Db250ZXh0KHJvb3QsIChyb290W1wiSlNPTjNcIl0gPSB7XG4gICAgICAvLyBQdWJsaWM6IFJlc3RvcmVzIHRoZSBvcmlnaW5hbCB2YWx1ZSBvZiB0aGUgZ2xvYmFsIGBKU09OYCBvYmplY3QgYW5kXG4gICAgICAvLyByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBgSlNPTjNgIG9iamVjdC5cbiAgICAgIFwibm9Db25mbGljdFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghaXNSZXN0b3JlZCkge1xuICAgICAgICAgIGlzUmVzdG9yZWQgPSB0cnVlO1xuICAgICAgICAgIHJvb3QuSlNPTiA9IG5hdGl2ZUpTT047XG4gICAgICAgICAgcm9vdFtcIkpTT04zXCJdID0gcHJldmlvdXNKU09OO1xuICAgICAgICAgIG5hdGl2ZUpTT04gPSBwcmV2aW91c0pTT04gPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBKU09OMztcbiAgICAgIH1cbiAgICB9KSk7XG5cbiAgICByb290LkpTT04gPSB7XG4gICAgICBcInBhcnNlXCI6IEpTT04zLnBhcnNlLFxuICAgICAgXCJzdHJpbmdpZnlcIjogSlNPTjMuc3RyaW5naWZ5XG4gICAgfTtcbiAgfVxuXG4gIC8vIEV4cG9ydCBmb3IgYXN5bmNocm9ub3VzIG1vZHVsZSBsb2FkZXJzLlxuICBpZiAoaXNMb2FkZXIpIHtcbiAgICBkZWZpbmUoZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIEpTT04zO1xuICAgIH0pO1xuICB9XG59KS5jYWxsKHRoaXMpO1xuIiwid2luZG93LiAgICAgdmxTY2hlbWEgPSB7XG4gIFwib25lT2ZcIjogW1xuICAgIHtcbiAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRXh0ZW5kZWRVbml0U3BlY1wiLFxuICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNjaGVtYSBmb3IgYSB1bml0IFZlZ2EtTGl0ZSBzcGVjaWZpY2F0aW9uLCB3aXRoIHRoZSBzeW50YWN0aWMgc3VnYXIgZXh0ZW5zaW9uczpcXG5cXG4tIGByb3dgIGFuZCBgY29sdW1uYCBhcmUgaW5jbHVkZWQgaW4gdGhlIGVuY29kaW5nLlxcblxcbi0gKEZ1dHVyZSkgbGFiZWwsIGJveCBwbG90XFxuXFxuXFxuXFxuTm90ZTogdGhlIHNwZWMgY291bGQgY29udGFpbiBmYWNldC5cIlxuICAgIH0sXG4gICAge1xuICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GYWNldFNwZWNcIlxuICAgIH0sXG4gICAge1xuICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9MYXllclNwZWNcIlxuICAgIH1cbiAgXSxcbiAgXCJkZWZpbml0aW9uc1wiOiB7XG4gICAgXCJFeHRlbmRlZFVuaXRTcGVjXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJtYXJrXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL01hcmtcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG1hcmsgdHlwZS5cXG5cXG5PbmUgb2YgYFxcXCJiYXJcXFwiYCwgYFxcXCJjaXJjbGVcXFwiYCwgYFxcXCJzcXVhcmVcXFwiYCwgYFxcXCJ0aWNrXFxcImAsIGBcXFwibGluZVxcXCJgLFxcblxcbmBcXFwiYXJlYVxcXCJgLCBgXFxcInBvaW50XFxcImAsIGBcXFwicnVsZVxcXCJgLCBhbmQgYFxcXCJ0ZXh0XFxcImAuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJlbmNvZGluZ1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9FbmNvZGluZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGtleS12YWx1ZSBtYXBwaW5nIGJldHdlZW4gZW5jb2RpbmcgY2hhbm5lbHMgYW5kIGRlZmluaXRpb24gb2YgZmllbGRzLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibmFtZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIHZpc3VhbGl6YXRpb24gZm9yIGxhdGVyIHJlZmVyZW5jZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRlc2NyaXB0aW9uXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb3B0aW9uYWwgZGVzY3JpcHRpb24gb2YgdGhpcyBtYXJrIGZvciBjb21tZW50aW5nIHB1cnBvc2UuXFxuXFxuVGhpcyBwcm9wZXJ0eSBoYXMgbm8gZWZmZWN0IG9uIHRoZSBvdXRwdXQgdmlzdWFsaXphdGlvbi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0YVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyB0aGUgZGF0YSBzb3VyY2VcIlxuICAgICAgICB9LFxuICAgICAgICBcInRyYW5zZm9ybVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UcmFuc2Zvcm1cIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IGRlc2NyaWJpbmcgZmlsdGVyIGFuZCBuZXcgZmllbGQgY2FsY3VsYXRpb24uXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb25maWdcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbmZpZ3VyYXRpb24gb2JqZWN0XCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicmVxdWlyZWRcIjogW1xuICAgICAgICBcIm1hcmtcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJNYXJrXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJhcmVhXCIsXG4gICAgICAgIFwiYmFyXCIsXG4gICAgICAgIFwibGluZVwiLFxuICAgICAgICBcInBvaW50XCIsXG4gICAgICAgIFwidGV4dFwiLFxuICAgICAgICBcInRpY2tcIixcbiAgICAgICAgXCJydWxlXCIsXG4gICAgICAgIFwiY2lyY2xlXCIsXG4gICAgICAgIFwic3F1YXJlXCIsXG4gICAgICAgIFwiZXJyb3JCYXJcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJFbmNvZGluZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwicm93XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJWZXJ0aWNhbCBmYWNldHMgZm9yIHRyZWxsaXMgcGxvdHMuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb2x1bW5cIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkhvcml6b250YWwgZmFjZXRzIGZvciB0cmVsbGlzIHBsb3RzLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwieFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiWCBjb29yZGluYXRlcyBmb3IgYHBvaW50YCwgYGNpcmNsZWAsIGBzcXVhcmVgLFxcblxcbmBsaW5lYCwgYHJ1bGVgLCBgdGV4dGAsIGFuZCBgdGlja2BcXG5cXG4ob3IgdG8gd2lkdGggYW5kIGhlaWdodCBmb3IgYGJhcmAgYW5kIGBhcmVhYCBtYXJrcykuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ5XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJZIGNvb3JkaW5hdGVzIGZvciBgcG9pbnRgLCBgY2lyY2xlYCwgYHNxdWFyZWAsXFxuXFxuYGxpbmVgLCBgcnVsZWAsIGB0ZXh0YCwgYW5kIGB0aWNrYFxcblxcbihvciB0byB3aWR0aCBhbmQgaGVpZ2h0IGZvciBgYmFyYCBhbmQgYGFyZWFgIG1hcmtzKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcIngyXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJYMiBjb29yZGluYXRlcyBmb3IgcmFuZ2VkIGBiYXJgLCBgcnVsZWAsIGBhcmVhYFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwieTJcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlkyIGNvb3JkaW5hdGVzIGZvciByYW5nZWQgYGJhcmAsIGBydWxlYCwgYGFyZWFgXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb2xvclwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DaGFubmVsRGVmV2l0aExlZ2VuZFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb2xvciBvZiB0aGUgbWFya3Mg4oCTIGVpdGhlciBmaWxsIG9yIHN0cm9rZSBjb2xvciBiYXNlZCBvbiBtYXJrIHR5cGUuXFxuXFxuKEJ5IGRlZmF1bHQsIGZpbGwgY29sb3IgZm9yIGBhcmVhYCwgYGJhcmAsIGB0aWNrYCwgYHRleHRgLCBgY2lyY2xlYCwgYW5kIGBzcXVhcmVgIC9cXG5cXG5zdHJva2UgY29sb3IgZm9yIGBsaW5lYCBhbmQgYHBvaW50YC4pXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvcGFjaXR5XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NoYW5uZWxEZWZXaXRoTGVnZW5kXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9wYWNpdHkgb2YgdGhlIG1hcmtzIOKAkyBlaXRoZXIgY2FuIGJlIGEgdmFsdWUgb3IgaW4gYSByYW5nZS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInNpemVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2hhbm5lbERlZldpdGhMZWdlbmRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2l6ZSBvZiB0aGUgbWFyay5cXG5cXG4tIEZvciBgcG9pbnRgLCBgc3F1YXJlYCBhbmQgYGNpcmNsZWBcXG5cXG7igJMgdGhlIHN5bWJvbCBzaXplLCBvciBwaXhlbCBhcmVhIG9mIHRoZSBtYXJrLlxcblxcbi0gRm9yIGBiYXJgIGFuZCBgdGlja2Ag4oCTIHRoZSBiYXIgYW5kIHRpY2sncyBzaXplLlxcblxcbi0gRm9yIGB0ZXh0YCDigJMgdGhlIHRleHQncyBmb250IHNpemUuXFxuXFxuLSBTaXplIGlzIGN1cnJlbnRseSB1bnN1cHBvcnRlZCBmb3IgYGxpbmVgIGFuZCBgYXJlYWAuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaGFwZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DaGFubmVsRGVmV2l0aExlZ2VuZFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc3ltYm9sJ3Mgc2hhcGUgKG9ubHkgZm9yIGBwb2ludGAgbWFya3MpLiBUaGUgc3VwcG9ydGVkIHZhbHVlcyBhcmVcXG5cXG5gXFxcImNpcmNsZVxcXCJgIChkZWZhdWx0KSwgYFxcXCJzcXVhcmVcXFwiYCwgYFxcXCJjcm9zc1xcXCJgLCBgXFxcImRpYW1vbmRcXFwiYCwgYFxcXCJ0cmlhbmdsZS11cFxcXCJgLFxcblxcbm9yIGBcXFwidHJpYW5nbGUtZG93blxcXCJgLCBvciBlbHNlIGEgY3VzdG9tIFNWRyBwYXRoIHN0cmluZy5cIlxuICAgICAgICB9LFxuICAgICAgICBcImRldGFpbFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFkZGl0aW9uYWwgbGV2ZWxzIG9mIGRldGFpbCBmb3IgZ3JvdXBpbmcgZGF0YSBpbiBhZ2dyZWdhdGUgdmlld3MgYW5kXFxuXFxuaW4gbGluZSBhbmQgYXJlYSBtYXJrcyB3aXRob3V0IG1hcHBpbmcgZGF0YSB0byBhIHNwZWNpZmljIHZpc3VhbCBjaGFubmVsLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZpZWxkRGVmXCIsXG4gICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlcmZhY2UgZm9yIGFueSBraW5kIG9mIEZpZWxkRGVmO1xcblxcbkZvciBzaW1wbGljaXR5LCB3ZSBkbyBub3QgZGVjbGFyZSBtdWx0aXBsZSBpbnRlcmZhY2VzIG9mIEZpZWxkRGVmIGxpa2VcXG5cXG53ZSBkbyBmb3IgSlNPTiBzY2hlbWEuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIixcbiAgICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZXJmYWNlIGZvciBhbnkga2luZCBvZiBGaWVsZERlZjtcXG5cXG5Gb3Igc2ltcGxpY2l0eSwgd2UgZG8gbm90IGRlY2xhcmUgbXVsdGlwbGUgaW50ZXJmYWNlcyBvZiBGaWVsZERlZiBsaWtlXFxuXFxud2UgZG8gZm9yIEpTT04gc2NoZW1hLlwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwidGV4dFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GaWVsZERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUZXh0IG9mIHRoZSBgdGV4dGAgbWFyay5cIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZpZWxkRGVmXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwYXRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3JkZXIgb2YgZGF0YSBwb2ludHMgaW4gbGluZSBtYXJrcy5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9PcmRlckNoYW5uZWxEZWZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9PcmRlckNoYW5uZWxEZWZcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcIm9yZGVyXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTGF5ZXIgb3JkZXIgZm9yIG5vbi1zdGFja2VkIG1hcmtzLCBvciBzdGFjayBvcmRlciBmb3Igc3RhY2tlZCBtYXJrcy5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9PcmRlckNoYW5uZWxEZWZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9PcmRlckNoYW5uZWxEZWZcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIlBvc2l0aW9uQ2hhbm5lbERlZlwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiYXhpc1wiOiB7XG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BeGlzXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwic2NhbGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU2NhbGVcIlxuICAgICAgICB9LFxuICAgICAgICBcInNvcnRcIjoge1xuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NvcnRGaWVsZFwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NvcnRPcmRlclwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImZpZWxkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTmFtZSBvZiB0aGUgZmllbGQgZnJvbSB3aGljaCB0byBwdWxsIGEgZGF0YSB2YWx1ZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInR5cGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVHlwZVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZW5jb2RlZCBmaWVsZCdzIHR5cGUgb2YgbWVhc3VyZW1lbnQuIFRoaXMgY2FuIGJlIGVpdGhlciBhIGZ1bGwgdHlwZVxcblxcbm5hbWUgKGBcXFwicXVhbnRpdGF0aXZlXFxcImAsIGBcXFwidGVtcG9yYWxcXFwiYCwgYFxcXCJvcmRpbmFsXFxcImAsICBhbmQgYFxcXCJub21pbmFsXFxcImApXFxuXFxub3IgYW4gaW5pdGlhbCBjaGFyYWN0ZXIgb2YgdGhlIHR5cGUgbmFtZSAoYFxcXCJRXFxcImAsIGBcXFwiVFxcXCJgLCBgXFxcIk9cXFwiYCwgYFxcXCJOXFxcImApLlxcblxcblRoaXMgcHJvcGVydHkgaXMgY2FzZSBpbnNlbnNpdGl2ZS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInZhbHVlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBjb25zdGFudCB2YWx1ZSBpbiB2aXN1YWwgZG9tYWluLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aW1lVW5pdFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UaW1lVW5pdFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaW1lIHVuaXQgZm9yIGEgYHRlbXBvcmFsYCBmaWVsZCAgKGUuZy4sIGB5ZWFyYCwgYHllYXJtb250aGAsIGBtb250aGAsIGBob3VyYCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiaW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGbGFnIGZvciBiaW5uaW5nIGEgYHF1YW50aXRhdGl2ZWAgZmllbGQsIG9yIGEgYmluIHByb3BlcnR5IG9iamVjdFxcblxcbmZvciBiaW5uaW5nIHBhcmFtZXRlcnMuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9CaW5cIixcbiAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkJpbm5pbmcgcHJvcGVydGllcyBvciBib29sZWFuIGZsYWcgZm9yIGRldGVybWluaW5nIHdoZXRoZXIgdG8gYmluIGRhdGEgb3Igbm90LlwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImFnZ3JlZ2F0ZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BZ2dyZWdhdGVPcFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBZ2dyZWdhdGlvbiBmdW5jdGlvbiBmb3IgdGhlIGZpZWxkXFxuXFxuKGUuZy4sIGBtZWFuYCwgYHN1bWAsIGBtZWRpYW5gLCBgbWluYCwgYG1heGAsIGBjb3VudGApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaXRsZSBmb3IgYXhpcyBvciBsZWdlbmQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJBeGlzXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJsYWJlbEFuZ2xlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHJvdGF0aW9uIGFuZ2xlIG9mIHRoZSBheGlzIGxhYmVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImZvcm1hdFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb3JtYXR0aW5nIHBhdHRlcm4gZm9yIGF4aXMgbGFiZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3JpZW50XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0F4aXNPcmllbnRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9yaWVudGF0aW9uIG9mIHRoZSBheGlzLiBPbmUgb2YgdG9wLCBib3R0b20sIGxlZnQgb3IgcmlnaHQuIFRoZSBvcmllbnRhdGlvbiBjYW4gYmUgdXNlZCB0byBmdXJ0aGVyIHNwZWNpYWxpemUgdGhlIGF4aXMgdHlwZSAoZS5nLiwgYSB5IGF4aXMgb3JpZW50ZWQgZm9yIHRoZSByaWdodCBlZGdlIG9mIHRoZSBjaGFydCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgdGl0bGUgZm9yIHRoZSBheGlzLiBTaG93cyBmaWVsZCBuYW1lIGFuZCBpdHMgZnVuY3Rpb24gYnkgZGVmYXVsdC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInZhbHVlc1wiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImF4aXNXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldpZHRoIG9mIHRoZSBheGlzIGxpbmVcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImxheWVyXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBzdHJpbmcgaW5kaWNhdGluZyBpZiB0aGUgYXhpcyAoYW5kIGFueSBncmlkbGluZXMpIHNob3VsZCBiZSBwbGFjZWQgYWJvdmUgb3IgYmVsb3cgdGhlIGRhdGEgbWFya3MuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0LCBpbiBwaXhlbHMsIGJ5IHdoaWNoIHRvIGRpc3BsYWNlIHRoZSBheGlzIGZyb20gdGhlIGVkZ2Ugb2YgdGhlIGVuY2xvc2luZyBncm91cCBvciBkYXRhIHJlY3RhbmdsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImF4aXNDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbG9yIG9mIGF4aXMgbGluZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyaWRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGZsYWcgaW5kaWNhdGUgaWYgZ3JpZGxpbmVzIHNob3VsZCBiZSBjcmVhdGVkIGluIGFkZGl0aW9uIHRvIHRpY2tzLiBJZiBgZ3JpZGAgaXMgdW5zcGVjaWZpZWQsIHRoZSBkZWZhdWx0IHZhbHVlIGlzIGB0cnVlYCBmb3IgUk9XIGFuZCBDT0wuIEZvciBYIGFuZCBZLCB0aGUgZGVmYXVsdCB2YWx1ZSBpcyBgdHJ1ZWAgZm9yIHF1YW50aXRhdGl2ZSBhbmQgdGltZSBmaWVsZHMgYW5kIGBmYWxzZWAgb3RoZXJ3aXNlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImdyaWRDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbG9yIG9mIGdyaWRsaW5lcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyaWREYXNoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCAoaW4gcGl4ZWxzKSBpbnRvIHdoaWNoIHRvIGJlZ2luIGRyYXdpbmcgd2l0aCB0aGUgZ3JpZCBkYXNoIGFycmF5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkT3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzdHJva2Ugb3BhY2l0eSBvZiBncmlkICh2YWx1ZSBiZXR3ZWVuIFswLDFdKVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZFdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGdyaWQgd2lkdGgsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkVuYWJsZSBvciBkaXNhYmxlIGxhYmVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEFsaWduXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGV4dCBhbGlnbm1lbnQgZm9yIHRoZSBMYWJlbC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQmFzZWxpbmVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUZXh0IGJhc2VsaW5lIGZvciB0aGUgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbE1heExlbmd0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRydW5jYXRlIGxhYmVscyB0aGF0IGFyZSB0b28gbG9uZy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMSxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInNob3J0VGltZUxhYmVsc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldoZXRoZXIgbW9udGggYW5kIGRheSBuYW1lcyBzaG91bGQgYmUgYWJicmV2aWF0ZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ViZGl2aWRlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSWYgcHJvdmlkZWQsIHNldHMgdGhlIG51bWJlciBvZiBtaW5vciB0aWNrcyBiZXR3ZWVuIG1ham9yIHRpY2tzICh0aGUgdmFsdWUgOSByZXN1bHRzIGluIGRlY2ltYWwgc3ViZGl2aXNpb24pLiBPbmx5IGFwcGxpY2FibGUgZm9yIGF4ZXMgdmlzdWFsaXppbmcgcXVhbnRpdGF0aXZlIHNjYWxlcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBkZXNpcmVkIG51bWJlciBvZiB0aWNrcywgZm9yIGF4ZXMgdmlzdWFsaXppbmcgcXVhbnRpdGF0aXZlIHNjYWxlcy4gVGhlIHJlc3VsdGluZyBudW1iZXIgbWF5IGJlIGRpZmZlcmVudCBzbyB0aGF0IHZhbHVlcyBhcmUgXFxcIm5pY2VcXFwiIChtdWx0aXBsZXMgb2YgMiwgNSwgMTApIGFuZCBsaWUgd2l0aGluIHRoZSB1bmRlcmx5aW5nIHNjYWxlJ3MgcmFuZ2UuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIGF4aXMncyB0aWNrLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja0xhYmVsQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIHRpY2sgbGFiZWwsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrTGFiZWxGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgb2YgdGhlIHRpY2sgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrTGFiZWxGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHNpemUgb2YgbGFiZWwsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tQYWRkaW5nXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHBhZGRpbmcsIGluIHBpeGVscywgYmV0d2VlbiB0aWNrcyBhbmQgdGV4dCBsYWJlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIG1ham9yLCBtaW5vciBhbmQgZW5kIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVNYWpvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIG1ham9yIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVNaW5vclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIG1pbm9yIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVFbmRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSwgaW4gcGl4ZWxzLCBvZiBlbmQgdGlja3MuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGgsIGluIHBpeGVscywgb2YgdGlja3MuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUNvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29sb3Igb2YgdGhlIHRpdGxlLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRm9udCBvZiB0aGUgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2l6ZSBvZiB0aGUgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRXZWlnaHRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXZWlnaHQgb2YgdGhlIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVPZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHRpdGxlIG9mZnNldCB2YWx1ZSBmb3IgdGhlIGF4aXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZU1heExlbmd0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk1heCBsZW5ndGggZm9yIGF4aXMgdGl0bGUgaWYgdGhlIHRpdGxlIGlzIGF1dG9tYXRpY2FsbHkgZ2VuZXJhdGVkIGZyb20gdGhlIGZpZWxkJ3MgZGVzY3JpcHRpb24uIEJ5IGRlZmF1bHQsIHRoaXMgaXMgYXV0b21hdGljYWxseSBiYXNlZCBvbiBjZWxsIHNpemUgYW5kIGNoYXJhY3RlcldpZHRoIHByb3BlcnR5LlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY2hhcmFjdGVyV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDaGFyYWN0ZXIgd2lkdGggZm9yIGF1dG9tYXRpY2FsbHkgZGV0ZXJtaW5pbmcgdGl0bGUgbWF4IGxlbmd0aC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcHRpb25hbCBtYXJrIHByb3BlcnR5IGRlZmluaXRpb25zIGZvciBjdXN0b20gYXhpcyBzdHlsaW5nLlwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiQXhpc09yaWVudFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwidG9wXCIsXG4gICAgICAgIFwicmlnaHRcIixcbiAgICAgICAgXCJsZWZ0XCIsXG4gICAgICAgIFwiYm90dG9tXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiU2NhbGVcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInR5cGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU2NhbGVUeXBlXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkb21haW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZG9tYWluIG9mIHRoZSBzY2FsZSwgcmVwcmVzZW50aW5nIHRoZSBzZXQgb2YgZGF0YSB2YWx1ZXMuIEZvciBxdWFudGl0YXRpdmUgZGF0YSwgdGhpcyBjYW4gdGFrZSB0aGUgZm9ybSBvZiBhIHR3by1lbGVtZW50IGFycmF5IHdpdGggbWluaW11bSBhbmQgbWF4aW11bSB2YWx1ZXMuIEZvciBvcmRpbmFsL2NhdGVnb3JpY2FsIGRhdGEsIHRoaXMgbWF5IGJlIGFuIGFycmF5IG9mIHZhbGlkIGlucHV0IHZhbHVlcy5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJyYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSByYW5nZSBvZiB0aGUgc2NhbGUsIHJlcHJlc2VudGluZyB0aGUgc2V0IG9mIHZpc3VhbCB2YWx1ZXMuIEZvciBudW1lcmljIHZhbHVlcywgdGhlIHJhbmdlIGNhbiB0YWtlIHRoZSBmb3JtIG9mIGEgdHdvLWVsZW1lbnQgYXJyYXkgd2l0aCBtaW5pbXVtIGFuZCBtYXhpbXVtIHZhbHVlcy4gRm9yIG9yZGluYWwgb3IgcXVhbnRpemVkIGRhdGEsIHRoZSByYW5nZSBtYXkgYnkgYW4gYXJyYXkgb2YgZGVzaXJlZCBvdXRwdXQgdmFsdWVzLCB3aGljaCBhcmUgbWFwcGVkIHRvIGVsZW1lbnRzIGluIHRoZSBzcGVjaWZpZWQgZG9tYWluLiBGb3Igb3JkaW5hbCBzY2FsZXMgb25seSwgdGhlIHJhbmdlIGNhbiBiZSBkZWZpbmVkIHVzaW5nIGEgRGF0YVJlZjogdGhlIHJhbmdlIHZhbHVlcyBhcmUgdGhlbiBkcmF3biBkeW5hbWljYWxseSBmcm9tIGEgYmFja2luZyBkYXRhIHNldC5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwicm91bmRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJZiB0cnVlLCByb3VuZHMgbnVtZXJpYyBvdXRwdXQgdmFsdWVzIHRvIGludGVnZXJzLiBUaGlzIGNhbiBiZSBoZWxwZnVsIGZvciBzbmFwcGluZyB0byB0aGUgcGl4ZWwgZ3JpZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiYW5kU2l6ZVwiOiB7XG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwYWRkaW5nXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQXBwbGllcyBzcGFjaW5nIGFtb25nIG9yZGluYWwgZWxlbWVudHMgaW4gdGhlIHNjYWxlIHJhbmdlLiBUaGUgYWN0dWFsIGVmZmVjdCBkZXBlbmRzIG9uIGhvdyB0aGUgc2NhbGUgaXMgY29uZmlndXJlZC4gSWYgdGhlIF9fcG9pbnRzX18gcGFyYW1ldGVyIGlzIGB0cnVlYCwgdGhlIHBhZGRpbmcgdmFsdWUgaXMgaW50ZXJwcmV0ZWQgYXMgYSBtdWx0aXBsZSBvZiB0aGUgc3BhY2luZyBiZXR3ZWVuIHBvaW50cy4gQSByZWFzb25hYmxlIHZhbHVlIGlzIDEuMCwgc3VjaCB0aGF0IHRoZSBmaXJzdCBhbmQgbGFzdCBwb2ludCB3aWxsIGJlIG9mZnNldCBmcm9tIHRoZSBtaW5pbXVtIGFuZCBtYXhpbXVtIHZhbHVlIGJ5IGhhbGYgdGhlIGRpc3RhbmNlIGJldHdlZW4gcG9pbnRzLiBPdGhlcndpc2UsIHBhZGRpbmcgaXMgdHlwaWNhbGx5IGluIHRoZSByYW5nZSBbMCwgMV0gYW5kIGNvcnJlc3BvbmRzIHRvIHRoZSBmcmFjdGlvbiBvZiBzcGFjZSBpbiB0aGUgcmFuZ2UgaW50ZXJ2YWwgdG8gYWxsb2NhdGUgdG8gcGFkZGluZy4gQSB2YWx1ZSBvZiAwLjUgbWVhbnMgdGhhdCB0aGUgcmFuZ2UgYmFuZCB3aWR0aCB3aWxsIGJlIGVxdWFsIHRvIHRoZSBwYWRkaW5nIHdpZHRoLiBGb3IgbW9yZSwgc2VlIHRoZSBbRDMgb3JkaW5hbCBzY2FsZSBkb2N1bWVudGF0aW9uXShodHRwczovL2dpdGh1Yi5jb20vbWJvc3RvY2svZDMvd2lraS9PcmRpbmFsLVNjYWxlcykuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjbGFtcFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIklmIHRydWUsIHZhbHVlcyB0aGF0IGV4Y2VlZCB0aGUgZGF0YSBkb21haW4gYXJlIGNsYW1wZWQgdG8gZWl0aGVyIHRoZSBtaW5pbXVtIG9yIG1heGltdW0gcmFuZ2UgdmFsdWVcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJuaWNlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSWYgc3BlY2lmaWVkLCBtb2RpZmllcyB0aGUgc2NhbGUgZG9tYWluIHRvIHVzZSBhIG1vcmUgaHVtYW4tZnJpZW5kbHkgdmFsdWUgcmFuZ2UuIElmIHNwZWNpZmllZCBhcyBhIHRydWUgYm9vbGVhbiwgbW9kaWZpZXMgdGhlIHNjYWxlIGRvbWFpbiB0byB1c2UgYSBtb3JlIGh1bWFuLWZyaWVuZGx5IG51bWJlciByYW5nZSAoZS5nLiwgNyBpbnN0ZWFkIG9mIDYuOTYpLiBJZiBzcGVjaWZpZWQgYXMgYSBzdHJpbmcsIG1vZGlmaWVzIHRoZSBzY2FsZSBkb21haW4gdG8gdXNlIGEgbW9yZSBodW1hbi1mcmllbmRseSB2YWx1ZSByYW5nZS4gRm9yIHRpbWUgYW5kIHV0YyBzY2FsZSB0eXBlcyBvbmx5LCB0aGUgbmljZSB2YWx1ZSBzaG91bGQgYmUgYSBzdHJpbmcgaW5kaWNhdGluZyB0aGUgZGVzaXJlZCB0aW1lIGludGVydmFsLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTmljZVRpbWVcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJleHBvbmVudFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNldHMgdGhlIGV4cG9uZW50IG9mIHRoZSBzY2FsZSB0cmFuc2Zvcm1hdGlvbi4gRm9yIHBvdyBzY2FsZSB0eXBlcyBvbmx5LCBvdGhlcndpc2UgaWdub3JlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInplcm9cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJZiBgdHJ1ZWAsIGVuc3VyZXMgdGhhdCBhIHplcm8gYmFzZWxpbmUgdmFsdWUgaXMgaW5jbHVkZWQgaW4gdGhlIHNjYWxlIGRvbWFpbi5cXG5cXG5EZWZhdWx0IHZhbHVlOiBgdHJ1ZWAgZm9yIGB4YCBhbmQgYHlgIGNoYW5uZWwgaWYgdGhlIHF1YW50aXRhdGl2ZSBmaWVsZCBpcyBub3QgYmlubmVkXFxuXFxuYW5kIG5vIGN1c3RvbSBgZG9tYWluYCBpcyBwcm92aWRlZDsgYGZhbHNlYCBvdGhlcndpc2UuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidXNlUmF3RG9tYWluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVXNlcyB0aGUgc291cmNlIGRhdGEgcmFuZ2UgYXMgc2NhbGUgZG9tYWluIGluc3RlYWQgb2YgYWdncmVnYXRlZCBkYXRhIGZvciBhZ2dyZWdhdGUgYXhpcy5cXG5cXG5UaGlzIHByb3BlcnR5IG9ubHkgd29ya3Mgd2l0aCBhZ2dyZWdhdGUgZnVuY3Rpb25zIHRoYXQgcHJvZHVjZSB2YWx1ZXMgd2l0aGluIHRoZSByYXcgZGF0YSBkb21haW4gKGBcXFwibWVhblxcXCJgLCBgXFxcImF2ZXJhZ2VcXFwiYCwgYFxcXCJzdGRldlxcXCJgLCBgXFxcInN0ZGV2cFxcXCJgLCBgXFxcIm1lZGlhblxcXCJgLCBgXFxcInExXFxcImAsIGBcXFwicTNcXFwiYCwgYFxcXCJtaW5cXFwiYCwgYFxcXCJtYXhcXFwiYCkuIEZvciBvdGhlciBhZ2dyZWdhdGlvbnMgdGhhdCBwcm9kdWNlIHZhbHVlcyBvdXRzaWRlIG9mIHRoZSByYXcgZGF0YSBkb21haW4gKGUuZy4gYFxcXCJjb3VudFxcXCJgLCBgXFxcInN1bVxcXCJgKSwgdGhpcyBwcm9wZXJ0eSBpcyBpZ25vcmVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIlNjYWxlVHlwZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwibGluZWFyXCIsXG4gICAgICAgIFwibG9nXCIsXG4gICAgICAgIFwicG93XCIsXG4gICAgICAgIFwic3FydFwiLFxuICAgICAgICBcInF1YW50aWxlXCIsXG4gICAgICAgIFwicXVhbnRpemVcIixcbiAgICAgICAgXCJvcmRpbmFsXCIsXG4gICAgICAgIFwidGltZVwiLFxuICAgICAgICBcInV0Y1wiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIk5pY2VUaW1lXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJzZWNvbmRcIixcbiAgICAgICAgXCJtaW51dGVcIixcbiAgICAgICAgXCJob3VyXCIsXG4gICAgICAgIFwiZGF5XCIsXG4gICAgICAgIFwid2Vla1wiLFxuICAgICAgICBcIm1vbnRoXCIsXG4gICAgICAgIFwieWVhclwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlNvcnRGaWVsZFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiZmllbGRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZmllbGQgbmFtZSB0byBhZ2dyZWdhdGUgb3Zlci5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9wXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0FnZ3JlZ2F0ZU9wXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzb3J0IGFnZ3JlZ2F0aW9uIG9wZXJhdG9yXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvcmRlclwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Tb3J0T3JkZXJcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJyZXF1aXJlZFwiOiBbXG4gICAgICAgIFwiZmllbGRcIixcbiAgICAgICAgXCJvcFwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkFnZ3JlZ2F0ZU9wXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJ2YWx1ZXNcIixcbiAgICAgICAgXCJjb3VudFwiLFxuICAgICAgICBcInZhbGlkXCIsXG4gICAgICAgIFwibWlzc2luZ1wiLFxuICAgICAgICBcImRpc3RpbmN0XCIsXG4gICAgICAgIFwic3VtXCIsXG4gICAgICAgIFwibWVhblwiLFxuICAgICAgICBcImF2ZXJhZ2VcIixcbiAgICAgICAgXCJ2YXJpYW5jZVwiLFxuICAgICAgICBcInZhcmlhbmNlcFwiLFxuICAgICAgICBcInN0ZGV2XCIsXG4gICAgICAgIFwic3RkZXZwXCIsXG4gICAgICAgIFwibWVkaWFuXCIsXG4gICAgICAgIFwicTFcIixcbiAgICAgICAgXCJxM1wiLFxuICAgICAgICBcIm1vZGVza2V3XCIsXG4gICAgICAgIFwibWluXCIsXG4gICAgICAgIFwibWF4XCIsXG4gICAgICAgIFwiYXJnbWluXCIsXG4gICAgICAgIFwiYXJnbWF4XCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiU29ydE9yZGVyXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJhc2NlbmRpbmdcIixcbiAgICAgICAgXCJkZXNjZW5kaW5nXCIsXG4gICAgICAgIFwibm9uZVwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlR5cGVcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcInF1YW50aXRhdGl2ZVwiLFxuICAgICAgICBcIm9yZGluYWxcIixcbiAgICAgICAgXCJ0ZW1wb3JhbFwiLFxuICAgICAgICBcIm5vbWluYWxcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJUaW1lVW5pdFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwieWVhclwiLFxuICAgICAgICBcIm1vbnRoXCIsXG4gICAgICAgIFwiZGF5XCIsXG4gICAgICAgIFwiZGF0ZVwiLFxuICAgICAgICBcImhvdXJzXCIsXG4gICAgICAgIFwibWludXRlc1wiLFxuICAgICAgICBcInNlY29uZHNcIixcbiAgICAgICAgXCJtaWxsaXNlY29uZHNcIixcbiAgICAgICAgXCJ5ZWFybW9udGhcIixcbiAgICAgICAgXCJ5ZWFybW9udGhkYXRlXCIsXG4gICAgICAgIFwieWVhcm1vbnRoZGF0ZWhvdXJzXCIsXG4gICAgICAgIFwieWVhcm1vbnRoZGF0ZWhvdXJzbWludXRlc1wiLFxuICAgICAgICBcInllYXJtb250aGRhdGVob3Vyc21pbnV0ZXNzZWNvbmRzXCIsXG4gICAgICAgIFwiaG91cnNtaW51dGVzXCIsXG4gICAgICAgIFwiaG91cnNtaW51dGVzc2Vjb25kc1wiLFxuICAgICAgICBcIm1pbnV0ZXNzZWNvbmRzXCIsXG4gICAgICAgIFwic2Vjb25kc21pbGxpc2Vjb25kc1wiLFxuICAgICAgICBcInF1YXJ0ZXJcIixcbiAgICAgICAgXCJ5ZWFycXVhcnRlclwiLFxuICAgICAgICBcInF1YXJ0ZXJtb250aFwiLFxuICAgICAgICBcInllYXJxdWFydGVybW9udGhcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJCaW5cIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcIm1pblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBtaW5pbXVtIGJpbiB2YWx1ZSB0byBjb25zaWRlci4gSWYgdW5zcGVjaWZpZWQsIHRoZSBtaW5pbXVtIHZhbHVlIG9mIHRoZSBzcGVjaWZpZWQgZmllbGQgaXMgdXNlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1heFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBtYXhpbXVtIGJpbiB2YWx1ZSB0byBjb25zaWRlci4gSWYgdW5zcGVjaWZpZWQsIHRoZSBtYXhpbXVtIHZhbHVlIG9mIHRoZSBzcGVjaWZpZWQgZmllbGQgaXMgdXNlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImJhc2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbnVtYmVyIGJhc2UgdG8gdXNlIGZvciBhdXRvbWF0aWMgYmluIGRldGVybWluYXRpb24gKGRlZmF1bHQgaXMgYmFzZSAxMCkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdGVwXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gZXhhY3Qgc3RlcCBzaXplIHRvIHVzZSBiZXR3ZWVuIGJpbnMuIElmIHByb3ZpZGVkLCBvcHRpb25zIHN1Y2ggYXMgbWF4YmlucyB3aWxsIGJlIGlnbm9yZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdGVwc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIGFycmF5IG9mIGFsbG93YWJsZSBzdGVwIHNpemVzIHRvIGNob29zZSBmcm9tLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJtaW5zdGVwXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBtaW5pbXVtIGFsbG93YWJsZSBzdGVwIHNpemUgKHBhcnRpY3VsYXJseSB1c2VmdWwgZm9yIGludGVnZXIgdmFsdWVzKS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImRpdlwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNjYWxlIGZhY3RvcnMgaW5kaWNhdGluZyBhbGxvd2FibGUgc3ViZGl2aXNpb25zLiBUaGUgZGVmYXVsdCB2YWx1ZSBpcyBbNSwgMl0sIHdoaWNoIGluZGljYXRlcyB0aGF0IGZvciBiYXNlIDEwIG51bWJlcnMgKHRoZSBkZWZhdWx0IGJhc2UpLCB0aGUgbWV0aG9kIG1heSBjb25zaWRlciBkaXZpZGluZyBiaW4gc2l6ZXMgYnkgNSBhbmQvb3IgMi4gRm9yIGV4YW1wbGUsIGZvciBhbiBpbml0aWFsIHN0ZXAgc2l6ZSBvZiAxMCwgdGhlIG1ldGhvZCBjYW4gY2hlY2sgaWYgYmluIHNpemVzIG9mIDIgKD0gMTAvNSksIDUgKD0gMTAvMiksIG9yIDEgKD0gMTAvKDUqMikpIG1pZ2h0IGFsc28gc2F0aXNmeSB0aGUgZ2l2ZW4gY29uc3RyYWludHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcIm1heGJpbnNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJNYXhpbXVtIG51bWJlciBvZiBiaW5zLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAyLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiQ2hhbm5lbERlZldpdGhMZWdlbmRcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImxlZ2VuZFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9MZWdlbmRcIlxuICAgICAgICB9LFxuICAgICAgICBcInNjYWxlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NjYWxlXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzb3J0XCI6IHtcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Tb3J0RmllbGRcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Tb3J0T3JkZXJcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIGZpZWxkIGZyb20gd2hpY2ggdG8gcHVsbCBhIGRhdGEgdmFsdWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0eXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1R5cGVcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGVuY29kZWQgZmllbGQncyB0eXBlIG9mIG1lYXN1cmVtZW50LiBUaGlzIGNhbiBiZSBlaXRoZXIgYSBmdWxsIHR5cGVcXG5cXG5uYW1lIChgXFxcInF1YW50aXRhdGl2ZVxcXCJgLCBgXFxcInRlbXBvcmFsXFxcImAsIGBcXFwib3JkaW5hbFxcXCJgLCAgYW5kIGBcXFwibm9taW5hbFxcXCJgKVxcblxcbm9yIGFuIGluaXRpYWwgY2hhcmFjdGVyIG9mIHRoZSB0eXBlIG5hbWUgKGBcXFwiUVxcXCJgLCBgXFxcIlRcXFwiYCwgYFxcXCJPXFxcImAsIGBcXFwiTlxcXCJgKS5cXG5cXG5UaGlzIHByb3BlcnR5IGlzIGNhc2UgaW5zZW5zaXRpdmUuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ2YWx1ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgY29uc3RhbnQgdmFsdWUgaW4gdmlzdWFsIGRvbWFpbi5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwidGltZVVuaXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVGltZVVuaXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGltZSB1bml0IGZvciBhIGB0ZW1wb3JhbGAgZmllbGQgIChlLmcuLCBgeWVhcmAsIGB5ZWFybW9udGhgLCBgbW9udGhgLCBgaG91cmApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmxhZyBmb3IgYmlubmluZyBhIGBxdWFudGl0YXRpdmVgIGZpZWxkLCBvciBhIGJpbiBwcm9wZXJ0eSBvYmplY3RcXG5cXG5mb3IgYmlubmluZyBwYXJhbWV0ZXJzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQmluXCIsXG4gICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJCaW5uaW5nIHByb3BlcnRpZXMgb3IgYm9vbGVhbiBmbGFnIGZvciBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIGJpbiBkYXRhIG9yIG5vdC5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJhZ2dyZWdhdGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQWdncmVnYXRlT3BcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQWdncmVnYXRpb24gZnVuY3Rpb24gZm9yIHRoZSBmaWVsZFxcblxcbihlLmcuLCBgbWVhbmAsIGBzdW1gLCBgbWVkaWFuYCwgYG1pbmAsIGBtYXhgLCBgY291bnRgKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGl0bGUgZm9yIGF4aXMgb3IgbGVnZW5kLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiTGVnZW5kXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJmb3JtYXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvcHRpb25hbCBmb3JtYXR0aW5nIHBhdHRlcm4gZm9yIGxlZ2VuZCBsYWJlbHMuIFZlZ2EgdXNlcyBEM1xcXFwncyBmb3JtYXQgcGF0dGVybi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSB0aXRsZSBmb3IgdGhlIGxlZ2VuZC4gKFNob3dzIGZpZWxkIG5hbWUgYW5kIGl0cyBmdW5jdGlvbiBieSBkZWZhdWx0LilcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInZhbHVlc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkV4cGxpY2l0bHkgc2V0IHRoZSB2aXNpYmxlIGxlZ2VuZCB2YWx1ZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIFwib3JpZW50XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9yaWVudGF0aW9uIG9mIHRoZSBsZWdlbmQuIE9uZSBvZiBcXFwibGVmdFxcXCIgb3IgXFxcInJpZ2h0XFxcIi4gVGhpcyBkZXRlcm1pbmVzIGhvdyB0aGUgbGVnZW5kIGlzIHBvc2l0aW9uZWQgd2l0aGluIHRoZSBzY2VuZS4gVGhlIGRlZmF1bHQgaXMgXFxcInJpZ2h0XFxcIi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQsIGluIHBpeGVscywgYnkgd2hpY2ggdG8gZGlzcGxhY2UgdGhlIGxlZ2VuZCBmcm9tIHRoZSBlZGdlIG9mIHRoZSBlbmNsb3NpbmcgZ3JvdXAgb3IgZGF0YSByZWN0YW5nbGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwYWRkaW5nXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHBhZGRpbmcsIGluIHBpeGVscywgYmV0d2VlbiB0aGUgbGVuZ2VuZCBhbmQgYXhpcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1hcmdpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBtYXJnaW4gYXJvdW5kIHRoZSBsZWdlbmQsIGluIHBpeGVsc1wiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JhZGllbnRTdHJva2VDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgZ3JhZGllbnQgc3Ryb2tlLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JhZGllbnRTdHJva2VXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCBvZiB0aGUgZ3JhZGllbnQgc3Ryb2tlLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudEhlaWdodFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBoZWlnaHQgb2YgdGhlIGdyYWRpZW50LCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudFdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoIG9mIHRoZSBncmFkaWVudCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxBbGlnblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBhbGlnbm1lbnQgb2YgdGhlIGxlZ2VuZCBsYWJlbCwgY2FuIGJlIGxlZnQsIG1pZGRsZSBvciByaWdodC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQmFzZWxpbmVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcG9zaXRpb24gb2YgdGhlIGJhc2VsaW5lIG9mIGxlZ2VuZCBsYWJlbCwgY2FuIGJlIHRvcCwgbWlkZGxlIG9yIGJvdHRvbS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIGxlZ2VuZCBsYWJlbCwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IG9mIHRoZSBsZW5nZW5kIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHNpemUgb2YgbGVuZ2VuZCBsYWJsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsT2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCBvZiB0aGUgbGVnZW5kIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2hvcnRUaW1lTGFiZWxzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2hldGhlciBtb250aCBuYW1lcyBhbmQgd2Vla2RheSBuYW1lcyBzaG91bGQgYmUgYWJicmV2aWF0ZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ltYm9sQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIGxlZ2VuZCBzeW1ib2wsXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xTaGFwZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaGFwZSBvZiB0aGUgbGVnZW5kIHN5bWJvbCwgY2FuIGJlIHRoZSAnY2lyY2xlJywgJ3NxdWFyZScsICdjcm9zcycsICdkaWFtb25kJyxcXG5cXG4ndHJpYW5nbGUtdXAnLCAndHJpYW5nbGUtZG93bicsIG9yIGVsc2UgYSBjdXN0b20gU1ZHIHBhdGggc3RyaW5nLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ltYm9sU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplIG9mIHRoZSBsZW5nZW5kIHN5bWJvbCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ltYm9sU3Ryb2tlV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGggb2YgdGhlIHN5bWJvbCdzIHN0cm9rZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcHRpb25hbCBtYXJrIHByb3BlcnR5IGRlZmluaXRpb25zIGZvciBjdXN0b20gbGVnZW5kIHN0eWxpbmcuXFxuXFxuVGhlIGNvbG9yIG9mIHRoZSBsZWdlbmQgdGl0bGUsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBvZiB0aGUgbGVnZW5kIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHNpemUgb2YgdGhlIGxlZ2VuZCB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFdlaWdodFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHdlaWdodCBvZiB0aGUgbGVnZW5kIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9wdGlvbmFsIG1hcmsgcHJvcGVydHkgZGVmaW5pdGlvbnMgZm9yIGN1c3RvbSBsZWdlbmQgc3R5bGluZy5cIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkZpZWxkRGVmXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIGZpZWxkIGZyb20gd2hpY2ggdG8gcHVsbCBhIGRhdGEgdmFsdWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0eXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1R5cGVcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGVuY29kZWQgZmllbGQncyB0eXBlIG9mIG1lYXN1cmVtZW50LiBUaGlzIGNhbiBiZSBlaXRoZXIgYSBmdWxsIHR5cGVcXG5cXG5uYW1lIChgXFxcInF1YW50aXRhdGl2ZVxcXCJgLCBgXFxcInRlbXBvcmFsXFxcImAsIGBcXFwib3JkaW5hbFxcXCJgLCAgYW5kIGBcXFwibm9taW5hbFxcXCJgKVxcblxcbm9yIGFuIGluaXRpYWwgY2hhcmFjdGVyIG9mIHRoZSB0eXBlIG5hbWUgKGBcXFwiUVxcXCJgLCBgXFxcIlRcXFwiYCwgYFxcXCJPXFxcImAsIGBcXFwiTlxcXCJgKS5cXG5cXG5UaGlzIHByb3BlcnR5IGlzIGNhc2UgaW5zZW5zaXRpdmUuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ2YWx1ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgY29uc3RhbnQgdmFsdWUgaW4gdmlzdWFsIGRvbWFpbi5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwidGltZVVuaXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVGltZVVuaXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGltZSB1bml0IGZvciBhIGB0ZW1wb3JhbGAgZmllbGQgIChlLmcuLCBgeWVhcmAsIGB5ZWFybW9udGhgLCBgbW9udGhgLCBgaG91cmApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmxhZyBmb3IgYmlubmluZyBhIGBxdWFudGl0YXRpdmVgIGZpZWxkLCBvciBhIGJpbiBwcm9wZXJ0eSBvYmplY3RcXG5cXG5mb3IgYmlubmluZyBwYXJhbWV0ZXJzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQmluXCIsXG4gICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJCaW5uaW5nIHByb3BlcnRpZXMgb3IgYm9vbGVhbiBmbGFnIGZvciBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIGJpbiBkYXRhIG9yIG5vdC5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJhZ2dyZWdhdGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQWdncmVnYXRlT3BcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQWdncmVnYXRpb24gZnVuY3Rpb24gZm9yIHRoZSBmaWVsZFxcblxcbihlLmcuLCBgbWVhbmAsIGBzdW1gLCBgbWVkaWFuYCwgYG1pbmAsIGBtYXhgLCBgY291bnRgKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGl0bGUgZm9yIGF4aXMgb3IgbGVnZW5kLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiT3JkZXJDaGFubmVsRGVmXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJzb3J0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NvcnRPcmRlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmllbGRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJOYW1lIG9mIHRoZSBmaWVsZCBmcm9tIHdoaWNoIHRvIHB1bGwgYSBkYXRhIHZhbHVlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidHlwZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UeXBlXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBlbmNvZGVkIGZpZWxkJ3MgdHlwZSBvZiBtZWFzdXJlbWVudC4gVGhpcyBjYW4gYmUgZWl0aGVyIGEgZnVsbCB0eXBlXFxuXFxubmFtZSAoYFxcXCJxdWFudGl0YXRpdmVcXFwiYCwgYFxcXCJ0ZW1wb3JhbFxcXCJgLCBgXFxcIm9yZGluYWxcXFwiYCwgIGFuZCBgXFxcIm5vbWluYWxcXFwiYClcXG5cXG5vciBhbiBpbml0aWFsIGNoYXJhY3RlciBvZiB0aGUgdHlwZSBuYW1lIChgXFxcIlFcXFwiYCwgYFxcXCJUXFxcImAsIGBcXFwiT1xcXCJgLCBgXFxcIk5cXFwiYCkuXFxuXFxuVGhpcyBwcm9wZXJ0eSBpcyBjYXNlIGluc2Vuc2l0aXZlLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidmFsdWVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGNvbnN0YW50IHZhbHVlIGluIHZpc3VhbCBkb21haW4uXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInRpbWVVbml0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RpbWVVbml0XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRpbWUgdW5pdCBmb3IgYSBgdGVtcG9yYWxgIGZpZWxkICAoZS5nLiwgYHllYXJgLCBgeWVhcm1vbnRoYCwgYG1vbnRoYCwgYGhvdXJgKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcImJpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZsYWcgZm9yIGJpbm5pbmcgYSBgcXVhbnRpdGF0aXZlYCBmaWVsZCwgb3IgYSBiaW4gcHJvcGVydHkgb2JqZWN0XFxuXFxuZm9yIGJpbm5pbmcgcGFyYW1ldGVycy5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0JpblwiLFxuICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQmlubmluZyBwcm9wZXJ0aWVzIG9yIGJvb2xlYW4gZmxhZyBmb3IgZGV0ZXJtaW5pbmcgd2hldGhlciB0byBiaW4gZGF0YSBvciBub3QuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiYWdncmVnYXRlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0FnZ3JlZ2F0ZU9wXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFnZ3JlZ2F0aW9uIGZ1bmN0aW9uIGZvciB0aGUgZmllbGRcXG5cXG4oZS5nLiwgYG1lYW5gLCBgc3VtYCwgYG1lZGlhbmAsIGBtaW5gLCBgbWF4YCwgYGNvdW50YCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRpdGxlIGZvciBheGlzIG9yIGxlZ2VuZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkRhdGFcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImZvcm1hdFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRhRm9ybWF0XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9iamVjdCB0aGF0IHNwZWNpZmllcyB0aGUgZm9ybWF0IGZvciB0aGUgZGF0YSBmaWxlIG9yIHZhbHVlcy5cIlxuICAgICAgICB9LFxuICAgICAgICBcInVybFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgVVJMIGZyb20gd2hpY2ggdG8gbG9hZCB0aGUgZGF0YSBzZXQuIFVzZSB0aGUgZm9ybWF0LnR5cGUgcHJvcGVydHlcXG5cXG50byBlbnN1cmUgdGhlIGxvYWRlZCBkYXRhIGlzIGNvcnJlY3RseSBwYXJzZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ2YWx1ZXNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJQYXNzIGFycmF5IG9mIG9iamVjdHMgaW5zdGVhZCBvZiBhIHVybCB0byBhIGZpbGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHt9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRGF0YUZvcm1hdFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwidHlwZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRhRm9ybWF0VHlwZVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUeXBlIG9mIGlucHV0IGRhdGE6IGBcXFwianNvblxcXCJgLCBgXFxcImNzdlxcXCJgLCBgXFxcInRzdlxcXCJgLlxcblxcblRoZSBkZWZhdWx0IGZvcm1hdCB0eXBlIGlzIGRldGVybWluZWQgYnkgdGhlIGV4dGVuc2lvbiBvZiB0aGUgZmlsZSB1cmwuXFxuXFxuSWYgbm8gZXh0ZW5zaW9uIGlzIGRldGVjdGVkLCBgXFxcImpzb25cXFwiYCB3aWxsIGJlIHVzZWQgYnkgZGVmYXVsdC5cIlxuICAgICAgICB9LFxuICAgICAgICBcInByb3BlcnR5XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSlNPTiBvbmx5KSBUaGUgSlNPTiBwcm9wZXJ0eSBjb250YWluaW5nIHRoZSBkZXNpcmVkIGRhdGEuXFxuXFxuVGhpcyBwYXJhbWV0ZXIgY2FuIGJlIHVzZWQgd2hlbiB0aGUgbG9hZGVkIEpTT04gZmlsZSBtYXkgaGF2ZSBzdXJyb3VuZGluZyBzdHJ1Y3R1cmUgb3IgbWV0YS1kYXRhLlxcblxcbkZvciBleGFtcGxlIGBcXFwicHJvcGVydHlcXFwiOiBcXFwidmFsdWVzLmZlYXR1cmVzXFxcImAgaXMgZXF1aXZhbGVudCB0byByZXRyaWV2aW5nIGBqc29uLnZhbHVlcy5mZWF0dXJlc2BcXG5cXG5mcm9tIHRoZSBsb2FkZWQgSlNPTiBvYmplY3QuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmZWF0dXJlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG5hbWUgb2YgdGhlIFRvcG9KU09OIG9iamVjdCBzZXQgdG8gY29udmVydCB0byBhIEdlb0pTT04gZmVhdHVyZSBjb2xsZWN0aW9uLlxcblxcbkZvciBleGFtcGxlLCBpbiBhIG1hcCBvZiB0aGUgd29ybGQsIHRoZXJlIG1heSBiZSBhbiBvYmplY3Qgc2V0IG5hbWVkIGBcXFwiY291bnRyaWVzXFxcImAuXFxuXFxuVXNpbmcgdGhlIGZlYXR1cmUgcHJvcGVydHksIHdlIGNhbiBleHRyYWN0IHRoaXMgc2V0IGFuZCBnZW5lcmF0ZSBhIEdlb0pTT04gZmVhdHVyZSBvYmplY3QgZm9yIGVhY2ggY291bnRyeS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1lc2hcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbmFtZSBvZiB0aGUgVG9wb0pTT04gb2JqZWN0IHNldCB0byBjb252ZXJ0IHRvIGEgbWVzaC5cXG5cXG5TaW1pbGFyIHRvIHRoZSBgZmVhdHVyZWAgb3B0aW9uLCBgbWVzaGAgZXh0cmFjdHMgYSBuYW1lZCBUb3BvSlNPTiBvYmplY3Qgc2V0LlxcblxcblVubGlrZSB0aGUgYGZlYXR1cmVgIG9wdGlvbiwgdGhlIGNvcnJlc3BvbmRpbmcgZ2VvIGRhdGEgaXMgcmV0dXJuZWQgYXMgYSBzaW5nbGUsIHVuaWZpZWQgbWVzaCBpbnN0YW5jZSwgbm90IGFzIGluaWRpdmlkdWFsIEdlb0pTT04gZmVhdHVyZXMuXFxuXFxuRXh0cmFjdGluZyBhIG1lc2ggaXMgdXNlZnVsIGZvciBtb3JlIGVmZmljaWVudGx5IGRyYXdpbmcgYm9yZGVycyBvciBvdGhlciBnZW9ncmFwaGljIGVsZW1lbnRzIHRoYXQgeW91IGRvIG5vdCBuZWVkIHRvIGFzc29jaWF0ZSB3aXRoIHNwZWNpZmljIHJlZ2lvbnMgc3VjaCBhcyBpbmRpdmlkdWFsIGNvdW50cmllcywgc3RhdGVzIG9yIGNvdW50aWVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRGF0YUZvcm1hdFR5cGVcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcImpzb25cIixcbiAgICAgICAgXCJjc3ZcIixcbiAgICAgICAgXCJ0c3ZcIixcbiAgICAgICAgXCJ0b3BvanNvblwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlRyYW5zZm9ybVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiZmlsdGVyXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBzdHJpbmcgY29udGFpbmluZyB0aGUgZmlsdGVyIFZlZ2EgZXhwcmVzc2lvbi4gVXNlIGBkYXR1bWAgdG8gcmVmZXIgdG8gdGhlIGN1cnJlbnQgZGF0YSBvYmplY3QuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0VxdWFsRmlsdGVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUmFuZ2VGaWx0ZXJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9JbkZpbHRlclwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRXF1YWxGaWx0ZXJcIlxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9SYW5nZUZpbHRlclwiXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0luRmlsdGVyXCJcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmlsdGVySW52YWxpZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldoZXRoZXIgdG8gZmlsdGVyIGludmFsaWQgdmFsdWVzIChgbnVsbGAgYW5kIGBOYU5gKSBmcm9tIHRoZSBkYXRhLiBCeSBkZWZhdWx0IChgdW5kZWZpbmVkYCksIG9ubHkgcXVhbnRpdGF0aXZlIGFuZCB0ZW1wb3JhbCBmaWVsZHMgYXJlIGZpbHRlcmVkLiBJZiBzZXQgdG8gYHRydWVgLCBhbGwgZGF0YSBpdGVtcyB3aXRoIG51bGwgdmFsdWVzIGFyZSBmaWx0ZXJlZC4gSWYgYGZhbHNlYCwgYWxsIGRhdGEgaXRlbXMgYXJlIGluY2x1ZGVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImNhbGN1bGF0ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNhbGN1bGF0ZSBuZXcgZmllbGQocykgdXNpbmcgdGhlIHByb3ZpZGVkIGV4cHJlc3NzaW9uKHMpLiBDYWxjdWxhdGlvbiBhcmUgYXBwbGllZCBiZWZvcmUgZmlsdGVyLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0Zvcm11bGFcIixcbiAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGb3JtdWxhIG9iamVjdCBmb3IgY2FsY3VsYXRlLlwiXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkVxdWFsRmlsdGVyXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ0aW1lVW5pdFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UaW1lVW5pdFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaW1lIHVuaXQgZm9yIHRoZSBmaWVsZCB0byBiZSBmaWx0ZXJlZC5cIlxuICAgICAgICB9LFxuICAgICAgICBcImZpZWxkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmllbGQgdG8gYmUgZmlsdGVyZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJlcXVhbFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlZhbHVlIHRoYXQgdGhlIGZpZWxkIHNob3VsZCBiZSBlcXVhbCB0by5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0ZVRpbWVcIixcbiAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9iamVjdCBmb3IgZGVmaW5pbmcgZGF0ZXRpbWUgaW4gVmVnYS1MaXRlIEZpbHRlci5cXG5cXG5JZiBib3RoIG1vbnRoIGFuZCBxdWFydGVyIGFyZSBwcm92aWRlZCwgbW9udGggaGFzIGhpZ2hlciBwcmVjZWRlbmNlLlxcblxcbmBkYXlgIGNhbm5vdCBiZSBjb21iaW5lZCB3aXRoIG90aGVyIGRhdGUuXFxuXFxuV2UgYWNjZXB0IHN0cmluZyBmb3IgbW9udGggYW5kIGRheSBuYW1lcy5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicmVxdWlyZWRcIjogW1xuICAgICAgICBcImZpZWxkXCIsXG4gICAgICAgIFwiZXF1YWxcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJEYXRlVGltZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwieWVhclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVnZXIgdmFsdWUgcmVwcmVzZW50aW5nIHRoZSB5ZWFyLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicXVhcnRlclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVnZXIgdmFsdWUgcmVwcmVzZW50aW5nIHRoZSBxdWFydGVyIG9mIHRoZSB5ZWFyIChmcm9tIDEtNCkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJtb250aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9uZSBvZjogKDEpIGludGVnZXIgdmFsdWUgcmVwcmVzZW50aW5nIHRoZSBtb250aCBmcm9tIGAxYC1gMTJgLiBgMWAgcmVwcmVzZW50cyBKYW51YXJ5OyAgKDIpIGNhc2UtaW5zZW5zaXRpdmUgbW9udGggbmFtZSAoZS5nLiwgYFxcXCJKYW51YXJ5XFxcImApOyAgKDMpIGNhc2UtaW5zZW5zaXRpdmUsIDMtY2hhcmFjdGVyIHNob3J0IG1vbnRoIG5hbWUgKGUuZy4sIGBcXFwiSmFuXFxcImApLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGF0ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVnZXIgdmFsdWUgcmVwcmVzZW50aW5nIHRoZSBkYXRlIGZyb20gMS0zMS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImRheVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlZhbHVlIHJlcHJlc2VudGluZyB0aGUgZGF5IG9mIHdlZWsuICBUaGlzIGNhbiBiZSBvbmUgb2Y6ICgxKSBpbnRlZ2VyIHZhbHVlIC0tIGAxYCByZXByZXNlbnRzIE1vbmRheTsgKDIpIGNhc2UtaW5zZW5zaXRpdmUgZGF5IG5hbWUgKGUuZy4sIGBcXFwiTW9uZGF5XFxcImApOyAgKDMpIGNhc2UtaW5zZW5zaXRpdmUsIDMtY2hhcmFjdGVyIHNob3J0IGRheSBuYW1lIChlLmcuLCBgXFxcIk1vblxcXCJgKS4gICA8YnIvPiAqKldhcm5pbmc6KiogQSBEYXRlVGltZSBkZWZpbml0aW9uIG9iamVjdCB3aXRoIGBkYXlgKiogc2hvdWxkIG5vdCBiZSBjb21iaW5lZCB3aXRoIGB5ZWFyYCwgYHF1YXJ0ZXJgLCBgbW9udGhgLCBvciBgZGF0ZWAuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJob3Vyc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVnZXIgdmFsdWUgcmVwcmVzZW50aW5nIHRoZSBob3VyIG9mIGRheSBmcm9tIDAtMjMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJtaW51dGVzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZWdlciB2YWx1ZSByZXByZXNlbnRpbmcgbWludXRlIHNlZ21lbnQgb2YgYSB0aW1lIGZyb20gMC01OS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInNlY29uZHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlZ2VyIHZhbHVlIHJlcHJlc2VudGluZyBzZWNvbmQgc2VnbWVudCBvZiBhIHRpbWUgZnJvbSAwLTU5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibWlsbGlzZWNvbmRzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZWdlciB2YWx1ZSByZXByZXNlbnRpbmcgbWlsbGlzZWNvbmQgc2VnbWVudCBvZiBhIHRpbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJSYW5nZUZpbHRlclwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwidGltZVVuaXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVGltZVVuaXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwidGltZSB1bml0IGZvciB0aGUgZmllbGQgdG8gYmUgZmlsdGVyZWQuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZpZWxkIHRvIGJlIGZpbHRlcmVkXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJyYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFycmF5IG9mIGluY2x1c2l2ZSBtaW5pbXVtIGFuZCBtYXhpbXVtIHZhbHVlc1xcblxcbmZvciBhIGZpZWxkIHZhbHVlIG9mIGEgZGF0YSBpdGVtIHRvIGJlIGluY2x1ZGVkIGluIHRoZSBmaWx0ZXJlZCBkYXRhLlwiLFxuICAgICAgICAgIFwibWF4SXRlbXNcIjogMixcbiAgICAgICAgICBcIm1pbkl0ZW1zXCI6IDIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0ZVRpbWVcIixcbiAgICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT2JqZWN0IGZvciBkZWZpbmluZyBkYXRldGltZSBpbiBWZWdhLUxpdGUgRmlsdGVyLlxcblxcbklmIGJvdGggbW9udGggYW5kIHF1YXJ0ZXIgYXJlIHByb3ZpZGVkLCBtb250aCBoYXMgaGlnaGVyIHByZWNlZGVuY2UuXFxuXFxuYGRheWAgY2Fubm90IGJlIGNvbWJpbmVkIHdpdGggb3RoZXIgZGF0ZS5cXG5cXG5XZSBhY2NlcHQgc3RyaW5nIGZvciBtb250aCBhbmQgZGF5IG5hbWVzLlwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJmaWVsZFwiLFxuICAgICAgICBcInJhbmdlXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiSW5GaWx0ZXJcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInRpbWVVbml0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RpbWVVbml0XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcInRpbWUgdW5pdCBmb3IgdGhlIGZpZWxkIHRvIGJlIGZpbHRlcmVkLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmllbGRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGaWVsZCB0byBiZSBmaWx0ZXJlZFwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiaW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHNldCBvZiB2YWx1ZXMgdGhhdCB0aGUgYGZpZWxkYCdzIHZhbHVlIHNob3VsZCBiZSBhIG1lbWJlciBvZixcXG5cXG5mb3IgYSBkYXRhIGl0ZW0gaW5jbHVkZWQgaW4gdGhlIGZpbHRlcmVkIGRhdGEuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0ZVRpbWVcIixcbiAgICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT2JqZWN0IGZvciBkZWZpbmluZyBkYXRldGltZSBpbiBWZWdhLUxpdGUgRmlsdGVyLlxcblxcbklmIGJvdGggbW9udGggYW5kIHF1YXJ0ZXIgYXJlIHByb3ZpZGVkLCBtb250aCBoYXMgaGlnaGVyIHByZWNlZGVuY2UuXFxuXFxuYGRheWAgY2Fubm90IGJlIGNvbWJpbmVkIHdpdGggb3RoZXIgZGF0ZS5cXG5cXG5XZSBhY2NlcHQgc3RyaW5nIGZvciBtb250aCBhbmQgZGF5IG5hbWVzLlwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJmaWVsZFwiLFxuICAgICAgICBcImluXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiRm9ybXVsYVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiZmllbGRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZmllbGQgaW4gd2hpY2ggdG8gc3RvcmUgdGhlIGNvbXB1dGVkIGZvcm11bGEgdmFsdWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJleHByXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBzdHJpbmcgY29udGFpbmluZyBhbiBleHByZXNzaW9uIGZvciB0aGUgZm9ybXVsYS4gVXNlIHRoZSB2YXJpYWJsZSBgZGF0dW1gIHRvIHRvIHJlZmVyIHRvIHRoZSBjdXJyZW50IGRhdGEgb2JqZWN0LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJmaWVsZFwiLFxuICAgICAgICBcImV4cHJcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInZpZXdwb3J0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoIGFuZCBoZWlnaHQgb2YgdGhlIG9uLXNjcmVlbiB2aWV3cG9ydCwgaW4gcGl4ZWxzLiBJZiBuZWNlc3NhcnksIGNsaXBwaW5nIGFuZCBzY3JvbGxpbmcgd2lsbCBiZSBhcHBsaWVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFja2dyb3VuZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNTUyBjb2xvciBwcm9wZXJ0eSB0byB1c2UgYXMgYmFja2dyb3VuZCBvZiB2aXN1YWxpemF0aW9uLiBEZWZhdWx0IGlzIGBcXFwidHJhbnNwYXJlbnRcXFwiYC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm51bWJlckZvcm1hdFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkQzIE51bWJlciBmb3JtYXQgZm9yIGF4aXMgbGFiZWxzIGFuZCB0ZXh0IHRhYmxlcy4gRm9yIGV4YW1wbGUgXFxcInNcXFwiIGZvciBTSSB1bml0cy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpbWVGb3JtYXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IGRhdGV0aW1lIGZvcm1hdCBmb3IgYXhpcyBhbmQgbGVnZW5kIGxhYmVscy4gVGhlIGZvcm1hdCBjYW4gYmUgc2V0IGRpcmVjdGx5IG9uIGVhY2ggYXhpcyBhbmQgbGVnZW5kLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY291bnRUaXRsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgYXhpcyBhbmQgbGVnZW5kIHRpdGxlIGZvciBjb3VudCBmaWVsZHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjZWxsXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NlbGxDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ2VsbCBDb25maWdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1hcmtcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTWFya0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJNYXJrIENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3ZlcmxheVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9PdmVybGF5Q29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk1hcmsgT3ZlcmxheSBDb25maWdcIlxuICAgICAgICB9LFxuICAgICAgICBcInNjYWxlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NjYWxlQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNjYWxlIENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYXhpc1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BeGlzQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkF4aXMgQ29uZmlnXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsZWdlbmRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTGVnZW5kQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkxlZ2VuZCBDb25maWdcIlxuICAgICAgICB9LFxuICAgICAgICBcImZhY2V0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZhY2V0Q29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZhY2V0IENvbmZpZ1wiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiQ2VsbENvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwid2lkdGhcIjoge1xuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiaGVpZ2h0XCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImNsaXBcIjoge1xuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImZpbGxcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZmlsbCBjb2xvci5cIixcbiAgICAgICAgICBcImZvcm1hdFwiOiBcImNvbG9yXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWxsT3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmaWxsIG9wYWNpdHkgKHZhbHVlIGJldHdlZW4gWzAsMV0pLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHN0cm9rZSBjb2xvci5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZU9wYWNpdHlcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc3Ryb2tlIG9wYWNpdHkgKHZhbHVlIGJldHdlZW4gWzAsMV0pLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc3Ryb2tlIHdpZHRoLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VEYXNoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gYXJyYXkgb2YgYWx0ZXJuYXRpbmcgc3Ryb2tlLCBzcGFjZSBsZW5ndGhzIGZvciBjcmVhdGluZyBkYXNoZWQgb3IgZG90dGVkIGxpbmVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VEYXNoT2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCAoaW4gcGl4ZWxzKSBpbnRvIHdoaWNoIHRvIGJlZ2luIGRyYXdpbmcgd2l0aCB0aGUgc3Ryb2tlIGRhc2ggYXJyYXkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJNYXJrQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJmaWxsZWRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaGV0aGVyIHRoZSBzaGFwZVxcXFwncyBjb2xvciBzaG91bGQgYmUgdXNlZCBhcyBmaWxsIGNvbG9yIGluc3RlYWQgb2Ygc3Ryb2tlIGNvbG9yLlxcblxcblRoaXMgaXMgb25seSBhcHBsaWNhYmxlIGZvciBcXFwiYmFyXFxcIiwgXFxcInBvaW50XFxcIiwgYW5kIFxcXCJhcmVhXFxcIi5cXG5cXG5BbGwgbWFya3MgZXhjZXB0IFxcXCJwb2ludFxcXCIgbWFya3MgYXJlIGZpbGxlZCBieSBkZWZhdWx0LlxcblxcblNlZSBNYXJrIERvY3VtZW50YXRpb24gKGh0dHA6Ly92ZWdhLmdpdGh1Yi5pby92ZWdhLWxpdGUvZG9jcy9tYXJrcy5odG1sKVxcblxcbmZvciB1c2FnZSBleGFtcGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBjb2xvci5cIixcbiAgICAgICAgICBcImZvcm1hdFwiOiBcImNvbG9yXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWxsXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBGaWxsIENvbG9yLiAgVGhpcyBoYXMgaGlnaGVyIHByZWNlZGVuY2UgdGhhbiBjb25maWcuY29sb3JcIixcbiAgICAgICAgICBcImZvcm1hdFwiOiBcImNvbG9yXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IFN0cm9rZSBDb2xvci4gIFRoaXMgaGFzIGhpZ2hlciBwcmVjZWRlbmNlIHRoYW4gY29uZmlnLmNvbG9yXCIsXG4gICAgICAgICAgXCJmb3JtYXRcIjogXCJjb2xvclwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJtYXhpbXVtXCI6IDEsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWxsT3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJtYXhpbXVtXCI6IDEsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VPcGFjaXR5XCI6IHtcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcIm1heGltdW1cIjogMSxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZVdpZHRoXCI6IHtcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZURhc2hcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBhcnJheSBvZiBhbHRlcm5hdGluZyBzdHJva2UsIHNwYWNlIGxlbmd0aHMgZm9yIGNyZWF0aW5nIGRhc2hlZCBvciBkb3R0ZWQgbGluZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZURhc2hPZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0IChpbiBwaXhlbHMpIGludG8gd2hpY2ggdG8gYmVnaW4gZHJhd2luZyB3aXRoIHRoZSBzdHJva2UgZGFzaCBhcnJheS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0YWNrZWRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU3RhY2tPZmZzZXRcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9yaWVudFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9PcmllbnRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9yaWVudGF0aW9uIG9mIGEgbm9uLXN0YWNrZWQgYmFyLCB0aWNrLCBhcmVhLCBhbmQgbGluZSBjaGFydHMuXFxuXFxuVGhlIHZhbHVlIGlzIGVpdGhlciBob3Jpem9udGFsIChkZWZhdWx0KSBvciB2ZXJ0aWNhbC5cXG5cXG4tIEZvciBiYXIsIHJ1bGUgYW5kIHRpY2ssIHRoaXMgZGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBzaXplIG9mIHRoZSBiYXIgYW5kIHRpY2tcXG5cXG5zaG91bGQgYmUgYXBwbGllZCB0byB4IG9yIHkgZGltZW5zaW9uLlxcblxcbi0gRm9yIGFyZWEsIHRoaXMgcHJvcGVydHkgZGV0ZXJtaW5lcyB0aGUgb3JpZW50IHByb3BlcnR5IG9mIHRoZSBWZWdhIG91dHB1dC5cXG5cXG4tIEZvciBsaW5lLCB0aGlzIHByb3BlcnR5IGRldGVybWluZXMgdGhlIHNvcnQgb3JkZXIgb2YgdGhlIHBvaW50cyBpbiB0aGUgbGluZVxcblxcbmlmIGBjb25maWcuc29ydExpbmVCeWAgaXMgbm90IHNwZWNpZmllZC5cXG5cXG5Gb3Igc3RhY2tlZCBjaGFydHMsIHRoaXMgaXMgYWx3YXlzIGRldGVybWluZWQgYnkgdGhlIG9yaWVudGF0aW9uIG9mIHRoZSBzdGFjaztcXG5cXG50aGVyZWZvcmUgZXhwbGljaXRseSBzcGVjaWZpZWQgdmFsdWUgd2lsbCBiZSBpZ25vcmVkLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiaW50ZXJwb2xhdGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvSW50ZXJwb2xhdGVcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGxpbmUgaW50ZXJwb2xhdGlvbiBtZXRob2QgdG8gdXNlLiBPbmUgb2YgbGluZWFyLCBzdGVwLWJlZm9yZSwgc3RlcC1hZnRlciwgYmFzaXMsIGJhc2lzLW9wZW4sIGNhcmRpbmFsLCBjYXJkaW5hbC1vcGVuLCBtb25vdG9uZS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInRlbnNpb25cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZXBlbmRpbmcgb24gdGhlIGludGVycG9sYXRpb24gdHlwZSwgc2V0cyB0aGUgdGVuc2lvbiBwYXJhbWV0ZXIuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsaW5lU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNpemUgb2YgbGluZSBtYXJrLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicnVsZVNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTaXplIG9mIHJ1bGUgbWFyay5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImJhclNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSBvZiB0aGUgYmFycy4gIElmIHVuc3BlY2lmaWVkLCB0aGUgZGVmYXVsdCBzaXplIGlzICBgYmFuZFNpemUtMWAsXFxuXFxud2hpY2ggcHJvdmlkZXMgMSBwaXhlbCBvZmZzZXQgYmV0d2VlbiBiYXJzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFyVGhpblNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSBvZiB0aGUgYmFycyBvbiBjb250aW51b3VzIHNjYWxlcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInNoYXBlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHN5bWJvbCBzaGFwZSB0byB1c2UuIE9uZSBvZiBjaXJjbGUgKGRlZmF1bHQpLCBzcXVhcmUsIGNyb3NzLCBkaWFtb25kLCB0cmlhbmdsZS11cCwgb3IgdHJpYW5nbGUtZG93biwgb3IgYSBjdXN0b20gU1ZHIHBhdGguXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU2hhcGVcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwic2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBwaXhlbCBhcmVhIGVhY2ggdGhlIHBvaW50LiBGb3IgZXhhbXBsZTogaW4gdGhlIGNhc2Ugb2YgY2lyY2xlcywgdGhlIHJhZGl1cyBpcyBkZXRlcm1pbmVkIGluIHBhcnQgYnkgdGhlIHNxdWFyZSByb290IG9mIHRoZSBzaXplIHZhbHVlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGggb2YgdGhlIHRpY2tzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1RoaWNrbmVzc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoaWNrbmVzcyBvZiB0aGUgdGljayBtYXJrLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYWxpZ25cIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvSG9yaXpvbnRhbEFsaWduXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBob3Jpem9udGFsIGFsaWdubWVudCBvZiB0aGUgdGV4dC4gT25lIG9mIGxlZnQsIHJpZ2h0LCBjZW50ZXIuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJhbmdsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSByb3RhdGlvbiBhbmdsZSBvZiB0aGUgdGV4dCwgaW4gZGVncmVlcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImJhc2VsaW5lXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1ZlcnRpY2FsQWxpZ25cIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHZlcnRpY2FsIGFsaWdubWVudCBvZiB0aGUgdGV4dC4gT25lIG9mIHRvcCwgbWlkZGxlLCBib3R0b20uXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkeFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBob3Jpem9udGFsIG9mZnNldCwgaW4gcGl4ZWxzLCBiZXR3ZWVuIHRoZSB0ZXh0IGxhYmVsIGFuZCBpdHMgYW5jaG9yIHBvaW50LiBUaGUgb2Zmc2V0IGlzIGFwcGxpZWQgYWZ0ZXIgcm90YXRpb24gYnkgdGhlIGFuZ2xlIHByb3BlcnR5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZHlcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgdmVydGljYWwgb2Zmc2V0LCBpbiBwaXhlbHMsIGJldHdlZW4gdGhlIHRleHQgbGFiZWwgYW5kIGl0cyBhbmNob3IgcG9pbnQuIFRoZSBvZmZzZXQgaXMgYXBwbGllZCBhZnRlciByb3RhdGlvbiBieSB0aGUgYW5nbGUgcHJvcGVydHkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJyYWRpdXNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJQb2xhciBjb29yZGluYXRlIHJhZGlhbCBvZmZzZXQsIGluIHBpeGVscywgb2YgdGhlIHRleHQgbGFiZWwgZnJvbSB0aGUgb3JpZ2luIGRldGVybWluZWQgYnkgdGhlIHggYW5kIHkgcHJvcGVydGllcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRoZXRhXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiUG9sYXIgY29vcmRpbmF0ZSBhbmdsZSwgaW4gcmFkaWFucywgb2YgdGhlIHRleHQgbGFiZWwgZnJvbSB0aGUgb3JpZ2luIGRldGVybWluZWQgYnkgdGhlIHggYW5kIHkgcHJvcGVydGllcy4gVmFsdWVzIGZvciB0aGV0YSBmb2xsb3cgdGhlIHNhbWUgY29udmVudGlvbiBvZiBhcmMgbWFyayBzdGFydEFuZ2xlIGFuZCBlbmRBbmdsZSBwcm9wZXJ0aWVzOiBhbmdsZXMgYXJlIG1lYXN1cmVkIGluIHJhZGlhbnMsIHdpdGggMCBpbmRpY2F0aW5nIFxcXCJub3J0aFxcXCIuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHR5cGVmYWNlIHRvIHNldCB0aGUgdGV4dCBpbiAoZS5nLiwgSGVsdmV0aWNhIE5ldWUpLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZm9udFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBzaXplLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmb250U3R5bGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRm9udFN0eWxlXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHN0eWxlIChlLmcuLCBpdGFsaWMpLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZm9udFdlaWdodFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Gb250V2VpZ2h0XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHdlaWdodCAoZS5nLiwgYm9sZCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmb3JtYXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9ybWF0dGluZyBwYXR0ZXJuIGZvciB0ZXh0IHZhbHVlLiBJZiBub3QgZGVmaW5lZCwgdGhpcyB3aWxsIGJlIGRldGVybWluZWQgYXV0b21hdGljYWxseS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInNob3J0VGltZUxhYmVsc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldoZXRoZXIgbW9udGggbmFtZXMgYW5kIHdlZWtkYXkgbmFtZXMgc2hvdWxkIGJlIGFiYnJldmlhdGVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcInRleHRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJQbGFjZWhvbGRlciBUZXh0XCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJhcHBseUNvbG9yVG9CYWNrZ3JvdW5kXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQXBwbHkgY29sb3IgZmllbGQgdG8gYmFja2dyb3VuZCBjb2xvciBpbnN0ZWFkIG9mIHRoZSB0ZXh0LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIlN0YWNrT2Zmc2V0XCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJ6ZXJvXCIsXG4gICAgICAgIFwiY2VudGVyXCIsXG4gICAgICAgIFwibm9ybWFsaXplXCIsXG4gICAgICAgIFwibm9uZVwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIk9yaWVudFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwiaG9yaXpvbnRhbFwiLFxuICAgICAgICBcInZlcnRpY2FsXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiSW50ZXJwb2xhdGVcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcImxpbmVhclwiLFxuICAgICAgICBcImxpbmVhci1jbG9zZWRcIixcbiAgICAgICAgXCJzdGVwXCIsXG4gICAgICAgIFwic3RlcC1iZWZvcmVcIixcbiAgICAgICAgXCJzdGVwLWFmdGVyXCIsXG4gICAgICAgIFwiYmFzaXNcIixcbiAgICAgICAgXCJiYXNpcy1vcGVuXCIsXG4gICAgICAgIFwiYmFzaXMtY2xvc2VkXCIsXG4gICAgICAgIFwiY2FyZGluYWxcIixcbiAgICAgICAgXCJjYXJkaW5hbC1vcGVuXCIsXG4gICAgICAgIFwiY2FyZGluYWwtY2xvc2VkXCIsXG4gICAgICAgIFwiYnVuZGxlXCIsXG4gICAgICAgIFwibW9ub3RvbmVcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJTaGFwZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwiY2lyY2xlXCIsXG4gICAgICAgIFwic3F1YXJlXCIsXG4gICAgICAgIFwiY3Jvc3NcIixcbiAgICAgICAgXCJkaWFtb25kXCIsXG4gICAgICAgIFwidHJpYW5nbGUtdXBcIixcbiAgICAgICAgXCJ0cmlhbmdsZS1kb3duXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiSG9yaXpvbnRhbEFsaWduXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJsZWZ0XCIsXG4gICAgICAgIFwicmlnaHRcIixcbiAgICAgICAgXCJjZW50ZXJcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJWZXJ0aWNhbEFsaWduXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJ0b3BcIixcbiAgICAgICAgXCJtaWRkbGVcIixcbiAgICAgICAgXCJib3R0b21cIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJGb250U3R5bGVcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcIm5vcm1hbFwiLFxuICAgICAgICBcIml0YWxpY1wiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkZvbnRXZWlnaHRcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcIm5vcm1hbFwiLFxuICAgICAgICBcImJvbGRcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJPdmVybGF5Q29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJsaW5lXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2hldGhlciB0byBvdmVybGF5IGxpbmUgd2l0aCBwb2ludC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJhcmVhXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0FyZWFPdmVybGF5XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlR5cGUgb2Ygb3ZlcmxheSBmb3IgYXJlYSBtYXJrIChsaW5lIG9yIGxpbmVwb2ludClcIlxuICAgICAgICB9LFxuICAgICAgICBcInBvaW50U3R5bGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTWFya0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHN0eWxlIGZvciB0aGUgb3ZlcmxheWVkIHBvaW50LlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGluZVN0eWxlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL01hcmtDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBzdHlsZSBmb3IgdGhlIG92ZXJsYXllZCBwb2ludC5cIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkFyZWFPdmVybGF5XCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJsaW5lXCIsXG4gICAgICAgIFwibGluZXBvaW50XCIsXG4gICAgICAgIFwibm9uZVwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlNjYWxlQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJyb3VuZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIklmIHRydWUsIHJvdW5kcyBudW1lcmljIG91dHB1dCB2YWx1ZXMgdG8gaW50ZWdlcnMuXFxuXFxuVGhpcyBjYW4gYmUgaGVscGZ1bCBmb3Igc25hcHBpbmcgdG8gdGhlIHBpeGVsIGdyaWQuXFxuXFxuKE9ubHkgYXZhaWxhYmxlIGZvciBgeGAsIGB5YCwgYHNpemVgLCBgcm93YCwgYW5kIGBjb2x1bW5gIHNjYWxlcy4pXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGV4dEJhbmRXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgYmFuZCB3aWR0aCBmb3IgYHhgIG9yZGluYWwgc2NhbGUgd2hlbiBpcyBtYXJrIGlzIGB0ZXh0YC5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImJhbmRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBiYW5kIHNpemUgZm9yICgxKSBgeWAgb3JkaW5hbCBzY2FsZSxcXG5cXG5hbmQgKDIpIGB4YCBvcmRpbmFsIHNjYWxlIHdoZW4gdGhlIG1hcmsgaXMgbm90IGB0ZXh0YC5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9wYWNpdHlcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBvcGFjaXR5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJwYWRkaW5nXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBwYWRkaW5nIGZvciBgeGAgYW5kIGB5YCBvcmRpbmFsIHNjYWxlcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInVzZVJhd0RvbWFpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlVzZXMgdGhlIHNvdXJjZSBkYXRhIHJhbmdlIGFzIHNjYWxlIGRvbWFpbiBpbnN0ZWFkIG9mIGFnZ3JlZ2F0ZWQgZGF0YSBmb3IgYWdncmVnYXRlIGF4aXMuXFxuXFxuVGhpcyBwcm9wZXJ0eSBvbmx5IHdvcmtzIHdpdGggYWdncmVnYXRlIGZ1bmN0aW9ucyB0aGF0IHByb2R1Y2UgdmFsdWVzIHdpdGhpbiB0aGUgcmF3IGRhdGEgZG9tYWluIChgXFxcIm1lYW5cXFwiYCwgYFxcXCJhdmVyYWdlXFxcImAsIGBcXFwic3RkZXZcXFwiYCwgYFxcXCJzdGRldnBcXFwiYCwgYFxcXCJtZWRpYW5cXFwiYCwgYFxcXCJxMVxcXCJgLCBgXFxcInEzXFxcImAsIGBcXFwibWluXFxcImAsIGBcXFwibWF4XFxcImApLiBGb3Igb3RoZXIgYWdncmVnYXRpb25zIHRoYXQgcHJvZHVjZSB2YWx1ZXMgb3V0c2lkZSBvZiB0aGUgcmF3IGRhdGEgZG9tYWluIChlLmcuIGBcXFwiY291bnRcXFwiYCwgYFxcXCJzdW1cXFwiYCksIHRoaXMgcHJvcGVydHkgaXMgaWdub3JlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJub21pbmFsQ29sb3JSYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcmFuZ2UgZm9yIG5vbWluYWwgY29sb3Igc2NhbGVcIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwic2VxdWVudGlhbENvbG9yUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBvcmRpbmFsIC8gY29udGludW91cyBjb2xvciBzY2FsZVwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzaGFwZVJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCByYW5nZSBmb3Igc2hhcGVcIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFyU2l6ZVJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCByYW5nZSBmb3IgYmFyIHNpemUgc2NhbGVcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiZm9udFNpemVSYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcmFuZ2UgZm9yIGZvbnQgc2l6ZSBzY2FsZVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJydWxlU2l6ZVJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCByYW5nZSBmb3IgcnVsZSBzdHJva2Ugd2lkdGhzXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciB0aWNrIHNwYW5zXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInBvaW50U2l6ZVJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCByYW5nZSBmb3IgYmFyIHNpemUgc2NhbGVcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiQXhpc0NvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiYXhpc1dpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2lkdGggb2YgdGhlIGF4aXMgbGluZVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGF5ZXJcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHN0cmluZyBpbmRpY2F0aW5nIGlmIHRoZSBheGlzIChhbmQgYW55IGdyaWRsaW5lcykgc2hvdWxkIGJlIHBsYWNlZCBhYm92ZSBvciBiZWxvdyB0aGUgZGF0YSBtYXJrcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQsIGluIHBpeGVscywgYnkgd2hpY2ggdG8gZGlzcGxhY2UgdGhlIGF4aXMgZnJvbSB0aGUgZWRnZSBvZiB0aGUgZW5jbG9zaW5nIGdyb3VwIG9yIGRhdGEgcmVjdGFuZ2xlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYXhpc0NvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29sb3Igb2YgYXhpcyBsaW5lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgZmxhZyBpbmRpY2F0ZSBpZiBncmlkbGluZXMgc2hvdWxkIGJlIGNyZWF0ZWQgaW4gYWRkaXRpb24gdG8gdGlja3MuIElmIGBncmlkYCBpcyB1bnNwZWNpZmllZCwgdGhlIGRlZmF1bHQgdmFsdWUgaXMgYHRydWVgIGZvciBST1cgYW5kIENPTC4gRm9yIFggYW5kIFksIHRoZSBkZWZhdWx0IHZhbHVlIGlzIGB0cnVlYCBmb3IgcXVhbnRpdGF0aXZlIGFuZCB0aW1lIGZpZWxkcyBhbmQgYGZhbHNlYCBvdGhlcndpc2UuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZENvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29sb3Igb2YgZ3JpZGxpbmVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZERhc2hcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0IChpbiBwaXhlbHMpIGludG8gd2hpY2ggdG8gYmVnaW4gZHJhd2luZyB3aXRoIHRoZSBncmlkIGRhc2ggYXJyYXkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImdyaWRPcGFjaXR5XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHN0cm9rZSBvcGFjaXR5IG9mIGdyaWQgKHZhbHVlIGJldHdlZW4gWzAsMV0pXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZ3JpZCB3aWR0aCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRW5hYmxlIG9yIGRpc2FibGUgbGFiZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQW5nbGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcm90YXRpb24gYW5nbGUgb2YgdGhlIGF4aXMgbGFiZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxBbGlnblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRleHQgYWxpZ25tZW50IGZvciB0aGUgTGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEJhc2VsaW5lXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGV4dCBiYXNlbGluZSBmb3IgdGhlIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxNYXhMZW5ndGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUcnVuY2F0ZSBsYWJlbHMgdGhhdCBhcmUgdG9vIGxvbmcuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDEsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaG9ydFRpbWVMYWJlbHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaGV0aGVyIG1vbnRoIGFuZCBkYXkgbmFtZXMgc2hvdWxkIGJlIGFiYnJldmlhdGVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcInN1YmRpdmlkZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIklmIHByb3ZpZGVkLCBzZXRzIHRoZSBudW1iZXIgb2YgbWlub3IgdGlja3MgYmV0d2VlbiBtYWpvciB0aWNrcyAodGhlIHZhbHVlIDkgcmVzdWx0cyBpbiBkZWNpbWFsIHN1YmRpdmlzaW9uKS4gT25seSBhcHBsaWNhYmxlIGZvciBheGVzIHZpc3VhbGl6aW5nIHF1YW50aXRhdGl2ZSBzY2FsZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgZGVzaXJlZCBudW1iZXIgb2YgdGlja3MsIGZvciBheGVzIHZpc3VhbGl6aW5nIHF1YW50aXRhdGl2ZSBzY2FsZXMuIFRoZSByZXN1bHRpbmcgbnVtYmVyIG1heSBiZSBkaWZmZXJlbnQgc28gdGhhdCB2YWx1ZXMgYXJlIFxcXCJuaWNlXFxcIiAobXVsdGlwbGVzIG9mIDIsIDUsIDEwKSBhbmQgbGllIHdpdGhpbiB0aGUgdW5kZXJseWluZyBzY2FsZSdzIHJhbmdlLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja0NvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbG9yIG9mIHRoZSBheGlzJ3MgdGljay5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tMYWJlbENvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbG9yIG9mIHRoZSB0aWNrIGxhYmVsLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja0xhYmVsRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IG9mIHRoZSB0aWNrIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja0xhYmVsRm9udFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBzaXplIG9mIGxhYmVsLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrUGFkZGluZ1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBwYWRkaW5nLCBpbiBwaXhlbHMsIGJldHdlZW4gdGlja3MgYW5kIHRleHQgbGFiZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSwgaW4gcGl4ZWxzLCBvZiBtYWpvciwgbWlub3IgYW5kIGVuZCB0aWNrcy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplTWFqb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSwgaW4gcGl4ZWxzLCBvZiBtYWpvciB0aWNrcy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplTWlub3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSwgaW4gcGl4ZWxzLCBvZiBtaW5vciB0aWNrcy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplRW5kXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUsIGluIHBpeGVscywgb2YgZW5kIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1dpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoLCBpbiBwaXhlbHMsIG9mIHRpY2tzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbG9yIG9mIHRoZSB0aXRsZSwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZvbnQgb2YgdGhlIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNpemUgb2YgdGhlIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250V2VpZ2h0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2VpZ2h0IG9mIHRoZSB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlT2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSB0aXRsZSBvZmZzZXQgdmFsdWUgZm9yIHRoZSBheGlzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVNYXhMZW5ndGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJNYXggbGVuZ3RoIGZvciBheGlzIHRpdGxlIGlmIHRoZSB0aXRsZSBpcyBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlZCBmcm9tIHRoZSBmaWVsZCdzIGRlc2NyaXB0aW9uLiBCeSBkZWZhdWx0LCB0aGlzIGlzIGF1dG9tYXRpY2FsbHkgYmFzZWQgb24gY2VsbCBzaXplIGFuZCBjaGFyYWN0ZXJXaWR0aCBwcm9wZXJ0eS5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImNoYXJhY3RlcldpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ2hhcmFjdGVyIHdpZHRoIGZvciBhdXRvbWF0aWNhbGx5IGRldGVybWluaW5nIHRpdGxlIG1heCBsZW5ndGguXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3B0aW9uYWwgbWFyayBwcm9wZXJ0eSBkZWZpbml0aW9ucyBmb3IgY3VzdG9tIGF4aXMgc3R5bGluZy5cIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkxlZ2VuZENvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwib3JpZW50XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9yaWVudGF0aW9uIG9mIHRoZSBsZWdlbmQuIE9uZSBvZiBcXFwibGVmdFxcXCIgb3IgXFxcInJpZ2h0XFxcIi4gVGhpcyBkZXRlcm1pbmVzIGhvdyB0aGUgbGVnZW5kIGlzIHBvc2l0aW9uZWQgd2l0aGluIHRoZSBzY2VuZS4gVGhlIGRlZmF1bHQgaXMgXFxcInJpZ2h0XFxcIi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQsIGluIHBpeGVscywgYnkgd2hpY2ggdG8gZGlzcGxhY2UgdGhlIGxlZ2VuZCBmcm9tIHRoZSBlZGdlIG9mIHRoZSBlbmNsb3NpbmcgZ3JvdXAgb3IgZGF0YSByZWN0YW5nbGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwYWRkaW5nXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHBhZGRpbmcsIGluIHBpeGVscywgYmV0d2VlbiB0aGUgbGVuZ2VuZCBhbmQgYXhpcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1hcmdpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBtYXJnaW4gYXJvdW5kIHRoZSBsZWdlbmQsIGluIHBpeGVsc1wiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JhZGllbnRTdHJva2VDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgZ3JhZGllbnQgc3Ryb2tlLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JhZGllbnRTdHJva2VXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCBvZiB0aGUgZ3JhZGllbnQgc3Ryb2tlLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudEhlaWdodFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBoZWlnaHQgb2YgdGhlIGdyYWRpZW50LCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudFdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoIG9mIHRoZSBncmFkaWVudCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxBbGlnblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBhbGlnbm1lbnQgb2YgdGhlIGxlZ2VuZCBsYWJlbCwgY2FuIGJlIGxlZnQsIG1pZGRsZSBvciByaWdodC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQmFzZWxpbmVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcG9zaXRpb24gb2YgdGhlIGJhc2VsaW5lIG9mIGxlZ2VuZCBsYWJlbCwgY2FuIGJlIHRvcCwgbWlkZGxlIG9yIGJvdHRvbS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIGxlZ2VuZCBsYWJlbCwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IG9mIHRoZSBsZW5nZW5kIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHNpemUgb2YgbGVuZ2VuZCBsYWJsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsT2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCBvZiB0aGUgbGVnZW5kIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2hvcnRUaW1lTGFiZWxzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2hldGhlciBtb250aCBuYW1lcyBhbmQgd2Vla2RheSBuYW1lcyBzaG91bGQgYmUgYWJicmV2aWF0ZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ltYm9sQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIGxlZ2VuZCBzeW1ib2wsXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xTaGFwZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaGFwZSBvZiB0aGUgbGVnZW5kIHN5bWJvbCwgY2FuIGJlIHRoZSAnY2lyY2xlJywgJ3NxdWFyZScsICdjcm9zcycsICdkaWFtb25kJyxcXG5cXG4ndHJpYW5nbGUtdXAnLCAndHJpYW5nbGUtZG93bicsIG9yIGVsc2UgYSBjdXN0b20gU1ZHIHBhdGggc3RyaW5nLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ltYm9sU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplIG9mIHRoZSBsZW5nZW5kIHN5bWJvbCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ltYm9sU3Ryb2tlV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGggb2YgdGhlIHN5bWJvbCdzIHN0cm9rZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcHRpb25hbCBtYXJrIHByb3BlcnR5IGRlZmluaXRpb25zIGZvciBjdXN0b20gbGVnZW5kIHN0eWxpbmcuXFxuXFxuVGhlIGNvbG9yIG9mIHRoZSBsZWdlbmQgdGl0bGUsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBvZiB0aGUgbGVnZW5kIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHNpemUgb2YgdGhlIGxlZ2VuZCB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFdlaWdodFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHdlaWdodCBvZiB0aGUgbGVnZW5kIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9wdGlvbmFsIG1hcmsgcHJvcGVydHkgZGVmaW5pdGlvbnMgZm9yIGN1c3RvbSBsZWdlbmQgc3R5bGluZy5cIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkZhY2V0Q29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJzY2FsZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GYWNldFNjYWxlQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZhY2V0IFNjYWxlIENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYXhpc1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BeGlzQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZhY2V0IEF4aXMgQ29uZmlnXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZhY2V0R3JpZENvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGYWNldCBHcmlkIENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY2VsbFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DZWxsQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZhY2V0IENlbGwgQ29uZmlnXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJGYWNldFNjYWxlQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJyb3VuZFwiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicGFkZGluZ1wiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJGYWNldEdyaWRDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImNvbG9yXCI6IHtcbiAgICAgICAgICBcImZvcm1hdFwiOiBcImNvbG9yXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvcGFjaXR5XCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9mZnNldFwiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJGYWNldFNwZWNcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImZhY2V0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZhY2V0XCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzcGVjXCI6IHtcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9MYXllclNwZWNcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Vbml0U3BlY1wiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcIm5hbWVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJOYW1lIG9mIHRoZSB2aXN1YWxpemF0aW9uIGZvciBsYXRlciByZWZlcmVuY2UuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkZXNjcmlwdGlvblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9wdGlvbmFsIGRlc2NyaXB0aW9uIG9mIHRoaXMgbWFyayBmb3IgY29tbWVudGluZyBwdXJwb3NlLlxcblxcblRoaXMgcHJvcGVydHkgaGFzIG5vIGVmZmVjdCBvbiB0aGUgb3V0cHV0IHZpc3VhbGl6YXRpb24uXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkYXRhXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0RhdGFcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IGRlc2NyaWJpbmcgdGhlIGRhdGEgc291cmNlXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0cmFuc2Zvcm1cIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVHJhbnNmb3JtXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9iamVjdCBkZXNjcmliaW5nIGZpbHRlciBhbmQgbmV3IGZpZWxkIGNhbGN1bGF0aW9uLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29uZmlnXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb25maWd1cmF0aW9uIG9iamVjdFwiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJmYWNldFwiLFxuICAgICAgICBcInNwZWNcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJGYWNldFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwicm93XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29sdW1uXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiTGF5ZXJTcGVjXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJsYXllcnNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJVbml0IHNwZWNzIHRoYXQgd2lsbCBiZSBsYXllcmVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1VuaXRTcGVjXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwibmFtZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIHZpc3VhbGl6YXRpb24gZm9yIGxhdGVyIHJlZmVyZW5jZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRlc2NyaXB0aW9uXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb3B0aW9uYWwgZGVzY3JpcHRpb24gb2YgdGhpcyBtYXJrIGZvciBjb21tZW50aW5nIHB1cnBvc2UuXFxuXFxuVGhpcyBwcm9wZXJ0eSBoYXMgbm8gZWZmZWN0IG9uIHRoZSBvdXRwdXQgdmlzdWFsaXphdGlvbi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0YVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyB0aGUgZGF0YSBzb3VyY2VcIlxuICAgICAgICB9LFxuICAgICAgICBcInRyYW5zZm9ybVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UcmFuc2Zvcm1cIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IGRlc2NyaWJpbmcgZmlsdGVyIGFuZCBuZXcgZmllbGQgY2FsY3VsYXRpb24uXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb25maWdcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbmZpZ3VyYXRpb24gb2JqZWN0XCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicmVxdWlyZWRcIjogW1xuICAgICAgICBcImxheWVyc1wiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlVuaXRTcGVjXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJtYXJrXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL01hcmtcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG1hcmsgdHlwZS5cXG5cXG5PbmUgb2YgYFxcXCJiYXJcXFwiYCwgYFxcXCJjaXJjbGVcXFwiYCwgYFxcXCJzcXVhcmVcXFwiYCwgYFxcXCJ0aWNrXFxcImAsIGBcXFwibGluZVxcXCJgLFxcblxcbmBcXFwiYXJlYVxcXCJgLCBgXFxcInBvaW50XFxcImAsIGBcXFwicnVsZVxcXCJgLCBhbmQgYFxcXCJ0ZXh0XFxcImAuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJlbmNvZGluZ1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Vbml0RW5jb2RpbmdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBrZXktdmFsdWUgbWFwcGluZyBiZXR3ZWVuIGVuY29kaW5nIGNoYW5uZWxzIGFuZCBkZWZpbml0aW9uIG9mIGZpZWxkcy5cIlxuICAgICAgICB9LFxuICAgICAgICBcIm5hbWVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJOYW1lIG9mIHRoZSB2aXN1YWxpemF0aW9uIGZvciBsYXRlciByZWZlcmVuY2UuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkZXNjcmlwdGlvblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9wdGlvbmFsIGRlc2NyaXB0aW9uIG9mIHRoaXMgbWFyayBmb3IgY29tbWVudGluZyBwdXJwb3NlLlxcblxcblRoaXMgcHJvcGVydHkgaGFzIG5vIGVmZmVjdCBvbiB0aGUgb3V0cHV0IHZpc3VhbGl6YXRpb24uXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkYXRhXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0RhdGFcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IGRlc2NyaWJpbmcgdGhlIGRhdGEgc291cmNlXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0cmFuc2Zvcm1cIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVHJhbnNmb3JtXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9iamVjdCBkZXNjcmliaW5nIGZpbHRlciBhbmQgbmV3IGZpZWxkIGNhbGN1bGF0aW9uLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29uZmlnXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb25maWd1cmF0aW9uIG9iamVjdFwiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJtYXJrXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiVW5pdEVuY29kaW5nXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ4XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJYIGNvb3JkaW5hdGVzIGZvciBgcG9pbnRgLCBgY2lyY2xlYCwgYHNxdWFyZWAsXFxuXFxuYGxpbmVgLCBgcnVsZWAsIGB0ZXh0YCwgYW5kIGB0aWNrYFxcblxcbihvciB0byB3aWR0aCBhbmQgaGVpZ2h0IGZvciBgYmFyYCBhbmQgYGFyZWFgIG1hcmtzKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInlcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlkgY29vcmRpbmF0ZXMgZm9yIGBwb2ludGAsIGBjaXJjbGVgLCBgc3F1YXJlYCxcXG5cXG5gbGluZWAsIGBydWxlYCwgYHRleHRgLCBhbmQgYHRpY2tgXFxuXFxuKG9yIHRvIHdpZHRoIGFuZCBoZWlnaHQgZm9yIGBiYXJgIGFuZCBgYXJlYWAgbWFya3MpLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwieDJcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlgyIGNvb3JkaW5hdGVzIGZvciByYW5nZWQgYGJhcmAsIGBydWxlYCwgYGFyZWFgXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ5MlwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiWTIgY29vcmRpbmF0ZXMgZm9yIHJhbmdlZCBgYmFyYCwgYHJ1bGVgLCBgYXJlYWBcIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbG9yXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NoYW5uZWxEZWZXaXRoTGVnZW5kXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbG9yIG9mIHRoZSBtYXJrcyDigJMgZWl0aGVyIGZpbGwgb3Igc3Ryb2tlIGNvbG9yIGJhc2VkIG9uIG1hcmsgdHlwZS5cXG5cXG4oQnkgZGVmYXVsdCwgZmlsbCBjb2xvciBmb3IgYGFyZWFgLCBgYmFyYCwgYHRpY2tgLCBgdGV4dGAsIGBjaXJjbGVgLCBhbmQgYHNxdWFyZWAgL1xcblxcbnN0cm9rZSBjb2xvciBmb3IgYGxpbmVgIGFuZCBgcG9pbnRgLilcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9wYWNpdHlcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2hhbm5lbERlZldpdGhMZWdlbmRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3BhY2l0eSBvZiB0aGUgbWFya3Mg4oCTIGVpdGhlciBjYW4gYmUgYSB2YWx1ZSBvciBpbiBhIHJhbmdlLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2l6ZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DaGFubmVsRGVmV2l0aExlZ2VuZFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTaXplIG9mIHRoZSBtYXJrLlxcblxcbi0gRm9yIGBwb2ludGAsIGBzcXVhcmVgIGFuZCBgY2lyY2xlYFxcblxcbuKAkyB0aGUgc3ltYm9sIHNpemUsIG9yIHBpeGVsIGFyZWEgb2YgdGhlIG1hcmsuXFxuXFxuLSBGb3IgYGJhcmAgYW5kIGB0aWNrYCDigJMgdGhlIGJhciBhbmQgdGljaydzIHNpemUuXFxuXFxuLSBGb3IgYHRleHRgIOKAkyB0aGUgdGV4dCdzIGZvbnQgc2l6ZS5cXG5cXG4tIFNpemUgaXMgY3VycmVudGx5IHVuc3VwcG9ydGVkIGZvciBgbGluZWAgYW5kIGBhcmVhYC5cIlxuICAgICAgICB9LFxuICAgICAgICBcInNoYXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NoYW5uZWxEZWZXaXRoTGVnZW5kXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzeW1ib2wncyBzaGFwZSAob25seSBmb3IgYHBvaW50YCBtYXJrcykuIFRoZSBzdXBwb3J0ZWQgdmFsdWVzIGFyZVxcblxcbmBcXFwiY2lyY2xlXFxcImAgKGRlZmF1bHQpLCBgXFxcInNxdWFyZVxcXCJgLCBgXFxcImNyb3NzXFxcImAsIGBcXFwiZGlhbW9uZFxcXCJgLCBgXFxcInRyaWFuZ2xlLXVwXFxcImAsXFxuXFxub3IgYFxcXCJ0cmlhbmdsZS1kb3duXFxcImAsIG9yIGVsc2UgYSBjdXN0b20gU1ZHIHBhdGggc3RyaW5nLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGV0YWlsXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQWRkaXRpb25hbCBsZXZlbHMgb2YgZGV0YWlsIGZvciBncm91cGluZyBkYXRhIGluIGFnZ3JlZ2F0ZSB2aWV3cyBhbmRcXG5cXG5pbiBsaW5lIGFuZCBhcmVhIG1hcmtzIHdpdGhvdXQgbWFwcGluZyBkYXRhIHRvIGEgc3BlY2lmaWMgdmlzdWFsIGNoYW5uZWwuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIixcbiAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVyZmFjZSBmb3IgYW55IGtpbmQgb2YgRmllbGREZWY7XFxuXFxuRm9yIHNpbXBsaWNpdHksIHdlIGRvIG5vdCBkZWNsYXJlIG11bHRpcGxlIGludGVyZmFjZXMgb2YgRmllbGREZWYgbGlrZVxcblxcbndlIGRvIGZvciBKU09OIHNjaGVtYS5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GaWVsZERlZlwiLFxuICAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlcmZhY2UgZm9yIGFueSBraW5kIG9mIEZpZWxkRGVmO1xcblxcbkZvciBzaW1wbGljaXR5LCB3ZSBkbyBub3QgZGVjbGFyZSBtdWx0aXBsZSBpbnRlcmZhY2VzIG9mIEZpZWxkRGVmIGxpa2VcXG5cXG53ZSBkbyBmb3IgSlNPTiBzY2hlbWEuXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ0ZXh0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZpZWxkRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRleHQgb2YgdGhlIGB0ZXh0YCBtYXJrLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIlxuICAgICAgICB9LFxuICAgICAgICBcInBhdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcmRlciBvZiBkYXRhIHBvaW50cyBpbiBsaW5lIG1hcmtzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwib3JkZXJcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJMYXllciBvcmRlciBmb3Igbm9uLXN0YWNrZWQgbWFya3MsIG9yIHN0YWNrIG9yZGVyIGZvciBzdGFja2VkIG1hcmtzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwiJHNjaGVtYVwiOiBcImh0dHA6Ly9qc29uLXNjaGVtYS5vcmcvZHJhZnQtMDQvc2NoZW1hI1wiXG59OyIsIid1c2Ugc3RyaWN0Jztcbi8qIGdsb2JhbHMgd2luZG93LCBhbmd1bGFyICovXG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJywgW1xuICAgICdMb2NhbFN0b3JhZ2VNb2R1bGUnLFxuICAgICdhbmd1bGFyLWdvb2dsZS1hbmFseXRpY3MnLFxuICAgICdhbmd1bGFyLXNvcnRhYmxlLXZpZXcnLFxuICAgICdhbmd1bGFyLXdlYnNxbCdcbiAgXSlcbiAgLmNvbnN0YW50KCdfJywgd2luZG93Ll8pXG4gIC8vIGRhdGFsaWIsIHZlZ2FsaXRlLCB2ZWdhXG4gIC5jb25zdGFudCgndmwnLCB3aW5kb3cudmwpXG4gIC5jb25zdGFudCgnY3FsJywgd2luZG93LmNxbClcbiAgLmNvbnN0YW50KCd2bFNjaGVtYScsIHdpbmRvdy52bFNjaGVtYSlcbiAgLmNvbnN0YW50KCd2ZycsIHdpbmRvdy52ZylcbiAgLmNvbnN0YW50KCd1dGlsJywgd2luZG93LnZnLnV0aWwpXG4gIC8vIG90aGVyIGxpYnJhcmllc1xuICAuY29uc3RhbnQoJ2pRdWVyeScsIHdpbmRvdy4kKVxuICAuY29uc3RhbnQoJ1BhcGEnLCB3aW5kb3cuUGFwYSlcbiAgLmNvbnN0YW50KCdCbG9iJywgd2luZG93LkJsb2IpXG4gIC5jb25zdGFudCgnVVJMJywgd2luZG93LlVSTClcbiAgLmNvbnN0YW50KCdEcm9wJywgd2luZG93LkRyb3ApXG4gIC5jb25zdGFudCgnSGVhcCcsIHdpbmRvdy5IZWFwKVxuICAvLyBVc2UgdGhlIGN1c3RvbWl6ZWQgdmVuZG9yL2pzb24zLWNvbXBhY3RzdHJpbmdpZnlcbiAgLmNvbnN0YW50KCdKU09OMycsIHdpbmRvdy5KU09OMy5ub0NvbmZsaWN0KCkpXG4gIC5jb25zdGFudCgnQU5ZJywgJ19fQU5ZX18nKVxuICAvLyBjb25zdGFudHNcbiAgLmNvbnN0YW50KCdjb25zdHMnLCB7XG4gICAgYWRkQ291bnQ6IHRydWUsIC8vIGFkZCBjb3VudCBmaWVsZCB0byBEYXRhc2V0LmRhdGFzY2hlbWFcbiAgICBkZWJ1ZzogdHJ1ZSxcbiAgICB1c2VVcmw6IHRydWUsXG4gICAgbG9nZ2luZzogdHJ1ZSxcbiAgICBsb2dMZXZlbDogJ0lORk8nLFxuICAgIGxvZ1ByaW50TGV2ZWw6ICdJTkZPJyxcbiAgICBsb2dUb1dlYlNxbDogZmFsc2UsIC8vIGluIHVzZXIgc3R1ZGllcywgc2V0IHRoaXMgdG8gdHJ1ZVxuICAgIGRlZmF1bHRDb25maWdTZXQ6ICdsYXJnZScsXG4gICAgYXBwSWQ6ICd2bHVpJyxcbiAgICAvLyBlbWJlZGRlZCBwb2xlc3RhciBhbmQgdm95YWdlciB3aXRoIGtub3duIGRhdGFcbiAgICBlbWJlZGRlZERhdGE6IHdpbmRvdy52Z3VpRGF0YSB8fCB1bmRlZmluZWQsXG4gICAgcHJpb3JpdHk6IHtcbiAgICAgIGJvb2ttYXJrOiAwLFxuICAgICAgcG9wdXA6IDAsXG4gICAgICB2aXNsaXN0OiAxMDAwXG4gICAgfSxcbiAgICBteXJpYVJlc3Q6ICdodHRwOi8vZWMyLTUyLTEtMzgtMTgyLmNvbXB1dGUtMS5hbWF6b25hd3MuY29tOjg3NTMnLFxuICAgIGRlZmF1bHRUaW1lRm46ICd5ZWFyJ1xuICB9KTtcbiIsImFuZ3VsYXIubW9kdWxlKFwidmx1aVwiKS5ydW4oW1wiJHRlbXBsYXRlQ2FjaGVcIiwgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHskdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2FkZG15cmlhZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJhZGQtbXlyaWEtZGF0YXNldFxcXCI+PHA+U2VsZWN0IGEgZGF0YXNldCBmcm9tIHRoZSBNeXJpYSBpbnN0YW5jZSBhdCA8aW5wdXQgbmctbW9kZWw9XFxcIm15cmlhUmVzdFVybFxcXCI+PGJ1dHRvbiBuZy1jbGljaz1cXFwibG9hZERhdGFzZXRzKFxcJ1xcJylcXFwiPnVwZGF0ZTwvYnV0dG9uPi48L3A+PGZvcm0gbmctc3VibWl0PVxcXCJhZGREYXRhc2V0KG15cmlhRGF0YXNldClcXFwiPjxkaXY+PHNlbGVjdCBuYW1lPVxcXCJteXJpYS1kYXRhc2V0XFxcIiBpZD1cXFwic2VsZWN0LW15cmlhLWRhdGFzZXRcXFwiIG5nLWRpc2FibGVkPVxcXCJkaXNhYmxlZFxcXCIgbmctbW9kZWw9XFxcIm15cmlhRGF0YXNldFxcXCIgbmctb3B0aW9ucz1cXFwib3B0aW9uTmFtZShkYXRhc2V0KSBmb3IgZGF0YXNldCBpbiBteXJpYURhdGFzZXRzIHRyYWNrIGJ5IGRhdGFzZXQucmVsYXRpb25OYW1lXFxcIj48b3B0aW9uIHZhbHVlPVxcXCJcXFwiPlNlbGVjdCBEYXRhc2V0Li4uPC9vcHRpb24+PC9zZWxlY3Q+PC9kaXY+PGJ1dHRvbiB0eXBlPVxcXCJzdWJtaXRcXFwiPkFkZCBkYXRhc2V0PC9idXR0b24+PC9mb3JtPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvYWRkdXJsZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJhZGQtdXJsLWRhdGFzZXRcXFwiPjxwPkFkZCB0aGUgbmFtZSBvZiB0aGUgZGF0YXNldCBhbmQgdGhlIFVSTCB0byBhIDxiPkpTT048L2I+IG9yIDxiPkNTVjwvYj4gKHdpdGggaGVhZGVyKSBmaWxlLiBNYWtlIHN1cmUgdGhhdCB0aGUgZm9ybWF0dGluZyBpcyBjb3JyZWN0IGFuZCBjbGVhbiB0aGUgZGF0YSBiZWZvcmUgYWRkaW5nIGl0LiBUaGUgYWRkZWQgZGF0YXNldCBpcyBvbmx5IHZpc2libGUgdG8geW91LjwvcD48Zm9ybSBuZy1zdWJtaXQ9XFxcImFkZEZyb21VcmwoYWRkZWREYXRhc2V0KVxcXCI+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PGxhYmVsIGZvcj1cXFwiZGF0YXNldC1uYW1lXFxcIj5OYW1lPC9sYWJlbD4gPGlucHV0IG5nLW1vZGVsPVxcXCJhZGRlZERhdGFzZXQubmFtZVxcXCIgaWQ9XFxcImRhdGFzZXQtbmFtZVxcXCIgdHlwZT1cXFwidGV4dFxcXCI+PC9kaXY+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PGxhYmVsIGZvcj1cXFwiZGF0YXNldC11cmxcXFwiPlVSTDwvbGFiZWw+IDxpbnB1dCBuZy1tb2RlbD1cXFwiYWRkZWREYXRhc2V0LnVybFxcXCIgaWQ9XFxcImRhdGFzZXQtdXJsXFxcIiB0eXBlPVxcXCJ1cmxcXFwiPjxwPk1ha2Ugc3VyZSB0aGF0IHlvdSBob3N0IHRoZSBmaWxlIG9uIGEgc2VydmVyIHRoYXQgaGFzIDxjb2RlPkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbjogKjwvY29kZT4gc2V0LjwvcD48L2Rpdj48YnV0dG9uIHR5cGU9XFxcInN1Ym1pdFxcXCI+QWRkIGRhdGFzZXQ8L2J1dHRvbj48L2Zvcm0+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9jaGFuZ2Vsb2FkZWRkYXRhc2V0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImNoYW5nZS1sb2FkZWQtZGF0YXNldFxcXCI+PGRpdiBuZy1pZj1cXFwidXNlckRhdGEubGVuZ3RoXFxcIj48aDM+VXBsb2FkZWQgRGF0YXNldHM8L2gzPjx1bD48bGkgbmctcmVwZWF0PVxcXCJkYXRhc2V0IGluIHVzZXJEYXRhIHRyYWNrIGJ5IGRhdGFzZXQuaWRcXFwiIG5nLWNsYXNzPVxcXCJ7c2VsZWN0ZWQ6IERhdGFzZXQuY3VycmVudERhdGFzZXQuaWQgPT09IGRhdGFzZXQuaWR9XFxcIj48YSBjbGFzcz1cXFwiZGF0YXNldFxcXCIgbmctY2xpY2s9XFxcInNlbGVjdERhdGFzZXQoZGF0YXNldClcXFwiIG5nLWRpc2FibGVkPVxcXCJEYXRhc2V0LmN1cnJlbnREYXRhc2V0LmlkID09PSBkYXRhc2V0LmlkXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZGF0YWJhc2VcXFwiPjwvaT4gPHN0cm9uZz57e2RhdGFzZXQubmFtZX19PC9zdHJvbmc+PC9hPiA8c3BhbiBuZy1pZj1cXFwiZGF0YXNldC5kZXNjcmlwdGlvblxcXCI+e3tkYXRhc2V0LmRlc2NyaXB0aW9ufX08L3NwYW4+IDxzdHJvbmcgbmctaWY9XFxcIkRhdGFzZXQuY3VycmVudERhdGFzZXQgPT09IGRhdGFzZXRcXFwiPihzZWxlY3RlZCk8L3N0cm9uZz48L2xpPjwvdWw+PC9kaXY+PGgzPkV4cGxvcmUgYSBTYW1wbGUgRGF0YXNldDwvaDM+PHVsIGNsYXNzPVxcXCJsb2FkZWQtZGF0YXNldC1saXN0XFxcIj48bGkgbmctcmVwZWF0PVxcXCJkYXRhc2V0IGluIHNhbXBsZURhdGEgdHJhY2sgYnkgZGF0YXNldC5pZFxcXCIgbmctY2xhc3M9XFxcIntzZWxlY3RlZDogRGF0YXNldC5jdXJyZW50RGF0YXNldC5pZCA9PT0gZGF0YXNldC5pZH1cXFwiPjxhIGNsYXNzPVxcXCJkYXRhc2V0XFxcIiBuZy1jbGljaz1cXFwic2VsZWN0RGF0YXNldChkYXRhc2V0KVxcXCIgbmctZGlzYWJsZWQ9XFxcIkRhdGFzZXQuY3VycmVudERhdGFzZXQuaWQgPT09IGRhdGFzZXQuaWRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1kYXRhYmFzZVxcXCI+PC9pPiA8c3Ryb25nPnt7ZGF0YXNldC5uYW1lfX08L3N0cm9uZz48L2E+IDxzdHJvbmcgbmctaWY9XFxcIkRhdGFzZXQuY3VycmVudERhdGFzZXQgPT09IGRhdGFzZXRcXFwiPihzZWxlY3RlZCk8L3N0cm9uZz4gPGVtIG5nLWlmPVxcXCJkYXRhc2V0LmRlc2NyaXB0aW9uXFxcIj57e2RhdGFzZXQuZGVzY3JpcHRpb259fTwvZW0+PC9saT48L3VsPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvZGF0YXNldG1vZGFsLmh0bWxcIixcIjxtb2RhbCBpZD1cXFwiZGF0YXNldC1tb2RhbFxcXCIgbWF4LXdpZHRoPVxcXCI4MDBweFxcXCI+PGRpdiBjbGFzcz1cXFwibW9kYWwtaGVhZGVyXFxcIj48bW9kYWwtY2xvc2UtYnV0dG9uPjwvbW9kYWwtY2xvc2UtYnV0dG9uPjxoMj5BZGQgRGF0YXNldDwvaDI+PC9kaXY+PGRpdiBjbGFzcz1cXFwibW9kYWwtbWFpblxcXCI+PHRhYnNldD48dGFiIGhlYWRpbmc9XFxcIkNoYW5nZSBEYXRhc2V0XFxcIj48Y2hhbmdlLWxvYWRlZC1kYXRhc2V0PjwvY2hhbmdlLWxvYWRlZC1kYXRhc2V0PjwvdGFiPjx0YWIgaGVhZGluZz1cXFwiUGFzdGUgb3IgVXBsb2FkIERhdGFcXFwiPjxwYXN0ZS1kYXRhc2V0PjwvcGFzdGUtZGF0YXNldD48L3RhYj48dGFiIGhlYWRpbmc9XFxcIkZyb20gVVJMXFxcIj48YWRkLXVybC1kYXRhc2V0PjwvYWRkLXVybC1kYXRhc2V0PjwvdGFiPjx0YWIgaGVhZGluZz1cXFwiRnJvbSBNeXJpYVxcXCI+PGFkZC1teXJpYS1kYXRhc2V0PjwvYWRkLW15cmlhLWRhdGFzZXQ+PC90YWI+PC90YWJzZXQ+PC9kaXY+PC9tb2RhbD5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2RhdGFzZXRzZWxlY3Rvci5odG1sXCIsXCI8YnV0dG9uIGlkPVxcXCJzZWxlY3QtZGF0YVxcXCIgY2xhc3M9XFxcInNtYWxsLWJ1dHRvbiBzZWxlY3QtZGF0YVxcXCIgbmctY2xpY2s9XFxcImxvYWREYXRhc2V0KCk7XFxcIj5DaGFuZ2U8L2J1dHRvbj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2ZpbGVkcm9wem9uZS5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJkcm9wem9uZVxcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L3Bhc3RlZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJwYXN0ZS1kYXRhXFxcIj48ZmlsZS1kcm9wem9uZSBkYXRhc2V0PVxcXCJkYXRhc2V0XFxcIiBtYXgtZmlsZS1zaXplPVxcXCIxMFxcXCIgdmFsaWQtbWltZS10eXBlcz1cXFwiW3RleHQvY3N2LCB0ZXh0L2pzb24sIHRleHQvdHN2XVxcXCI+PGRpdiBjbGFzcz1cXFwidXBsb2FkLWRhdGFcXFwiPjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjxsYWJlbCBmb3I9XFxcImRhdGFzZXQtZmlsZVxcXCI+RmlsZTwvbGFiZWw+IDxpbnB1dCB0eXBlPVxcXCJmaWxlXFxcIiBpZD1cXFwiZGF0YXNldC1maWxlXFxcIiBhY2NlcHQ9XFxcInRleHQvY3N2LHRleHQvdHN2XFxcIj48L2Rpdj48cD5VcGxvYWQgYSBDU1YsIG9yIHBhc3RlIGRhdGEgaW4gPGEgaHJlZj1cXFwiaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQ29tbWEtc2VwYXJhdGVkX3ZhbHVlc1xcXCI+Q1NWPC9hPiBmb3JtYXQgaW50byB0aGUgZmllbGRzLjwvcD48ZGl2IGNsYXNzPVxcXCJkcm9wem9uZS10YXJnZXRcXFwiPjxwPkRyb3AgQ1NWIGZpbGUgaGVyZTwvcD48L2Rpdj48L2Rpdj48Zm9ybSBuZy1zdWJtaXQ9XFxcImFkZERhdGFzZXQoKVxcXCI+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PGxhYmVsIGZvcj1cXFwiZGF0YXNldC1uYW1lXFxcIj5OYW1lPC9sYWJlbD4gPGlucHV0IHR5cGU9XFxcIm5hbWVcXFwiIG5nLW1vZGVsPVxcXCJkYXRhc2V0Lm5hbWVcXFwiIGlkPVxcXCJkYXRhc2V0LW5hbWVcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPjwvZGl2PjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjx0ZXh0YXJlYSBuZy1tb2RlbD1cXFwiZGF0YXNldC5kYXRhXFxcIiBuZy1tb2RlbC1vcHRpb25zPVxcXCJ7IHVwZGF0ZU9uOiBcXCdkZWZhdWx0IGJsdXJcXCcsIGRlYm91bmNlOiB7IFxcJ2RlZmF1bHRcXCc6IDE3LCBcXCdibHVyXFwnOiAwIH19XFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cXG4gICAgICA8L3RleHRhcmVhPjwvZGl2PjxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIj5BZGQgZGF0YTwvYnV0dG9uPjwvZm9ybT48L2ZpbGUtZHJvcHpvbmU+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9hbGVydG1lc3NhZ2VzL2FsZXJ0bWVzc2FnZXMuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiYWxlcnQtYm94XFxcIiBuZy1zaG93PVxcXCJBbGVydHMuYWxlcnRzLmxlbmd0aCA+IDBcXFwiPjxkaXYgY2xhc3M9XFxcImFsZXJ0LWl0ZW1cXFwiIG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gQWxlcnRzLmFsZXJ0c1xcXCI+e3sgYWxlcnQubXNnIH19IDxhIGNsYXNzPVxcXCJjbG9zZVxcXCIgbmctY2xpY2s9XFxcIkFsZXJ0cy5jbG9zZUFsZXJ0KCRpbmRleClcXFwiPiZ0aW1lczs8L2E+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9ib29rbWFya2xpc3QvYm9va21hcmtsaXN0Lmh0bWxcIixcIjxtb2RhbCBpZD1cXFwiYm9va21hcmstbGlzdFxcXCIgbmctaWY9XFxcIkJvb2ttYXJrcy5pc1N1cHBvcnRlZFxcXCI+PGRpdiBjbGFzcz1cXFwibW9kYWwtaGVhZGVyIGNhcmQgbm8tdG9wLW1hcmdpbiBuby1yaWdodC1tYXJnaW5cXFwiPjxtb2RhbC1jbG9zZS1idXR0b24gY2xvc2UtYWN0aW9uPVxcXCJCb29rbWFya3MubG9nQm9va21hcmtzQ2xvc2VkKClcXFwiPjwvbW9kYWwtY2xvc2UtYnV0dG9uPjxoMiBjbGFzcz1cXFwibm8tYm90dG9tLW1hcmdpblxcXCI+Qm9va21hcmtzICh7eyBCb29rbWFya3MubGlzdC5sZW5ndGggfX0pPC9oMj48YSBjbGFzcz1cXFwiYm9va21hcmstbGlzdC11dGlsXFxcIiBuZy1jbGljaz1cXFwiQm9va21hcmtzLmNsZWFyKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10cmFzaC1vXFxcIj48L2k+IENsZWFyIGFsbDwvYT4gPGEgY2xhc3M9XFxcImJvb2ttYXJrLWxpc3QtdXRpbFxcXCIgbmctY2xpY2s9XFxcIkJvb2ttYXJrcy5leHBvcnQoKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWNsaXBib2FyZFxcXCI+PC9pPiBFeHBvcnQ8L2E+PC9kaXY+PGRpdiBjbGFzcz1cXFwiZmxleC1ncm93LTEgc2Nyb2xsLXlcXFwiPjxkaXYgbmctaWY9XFxcIkJvb2ttYXJrcy5saXN0Lmxlbmd0aCA+IDBcXFwiIGNsYXNzPVxcXCJoZmxleCBmbGV4LXdyYXBcXFwiIHN2LXJvb3Q9XFxcIlxcXCIgc3YtcGFydD1cXFwiQm9va21hcmtzLmxpc3RcXFwiIHN2LW9uLXNvcnQ9XFxcIkJvb2ttYXJrcy5yZW9yZGVyKClcXFwiPjx2bC1wbG90LWdyb3VwIG5nLXJlcGVhdD1cXFwiYm9va21hcmsgaW4gQm9va21hcmtzLmxpc3QgfCBvcmRlck9iamVjdEJ5IDogXFwndGltZUFkZGVkXFwnIDogZmFsc2VcXFwiIGNsYXNzPVxcXCJ3cmFwcGVkLXZsLXBsb3QtZ3JvdXAgY2FyZFxcXCIgbGlzdC10aXRsZT1cXFwiQm9va21hcmtcXFwiIGNoYXJ0PVxcXCJib29rbWFyay5jaGFydFxcXCIgZmllbGQtc2V0PVxcXCJib29rbWFyay5jaGFydC5maWVsZFNldFxcXCIgc2hvdy1ib29rbWFyaz1cXFwidHJ1ZVxcXCIgc2hvdy1kZWJ1Zz1cXFwiY29uc3RzLmRlYnVnXFxcIiBzaG93LWV4cGFuZD1cXFwiZmFsc2VcXFwiIGFsd2F5cy1zZWxlY3RlZD1cXFwidHJ1ZVxcXCIgaGlnaGxpZ2h0ZWQ9XFxcImhpZ2hsaWdodGVkXFxcIiBvdmVyZmxvdz1cXFwidHJ1ZVxcXCIgdG9vbHRpcD1cXFwidHJ1ZVxcXCIgcHJpb3JpdHk9XFxcImNvbnN0cy5wcmlvcml0eS5ib29rbWFya1xcXCIgc3YtZWxlbWVudD1cXFwiXFxcIj48L3ZsLXBsb3QtZ3JvdXA+PGRpdiBzdi1wbGFjZWhvbGRlcj1cXFwiXFxcIj48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ2aXMtbGlzdC1lbXB0eVxcXCIgbmctaWY9XFxcIkJvb2ttYXJrcy5saXN0Lmxlbmd0aCA9PT0gMFxcXCI+WW91IGhhdmUgbm8gYm9va21hcmtzPC9kaXY+PC9kaXY+PC9tb2RhbD5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL2NoYW5uZWxzaGVsZi9jaGFubmVsc2hlbGYuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwic2hlbGYtZ3JvdXBcXFwiPjxkaXYgY2xhc3M9XFxcInNoZWxmXFxcIiBuZy1jbGFzcz1cXFwie2Rpc2FibGVkOiBkaXNhYmxlZCB8fCAhc3VwcG9ydE1hcmsoY2hhbm5lbElkLCBtYXJrKSwgXFwnYW55XFwnOiBpc0FueUNoYW5uZWx9XFxcIj48ZGl2IGNsYXNzPVxcXCJzaGVsZi1sYWJlbFxcXCIgbmctY2xhc3M9XFxcIntleHBhbmRlZDogcHJvcHNFeHBhbmRlZH1cXFwiPnt7IGlzQW55Q2hhbm5lbCA/IFxcJ2FueVxcJyA6IGNoYW5uZWxJZCB9fTwvZGl2PjxkaXYgY2xhc3M9XFxcImZpZWxkLWRyb3BcXFwiIG5nLW1vZGVsPVxcXCJwaWxsc1tjaGFubmVsSWRdXFxcIiBkYXRhLWRyb3A9XFxcIiFkaXNhYmxlZCAmJiBzdXBwb3J0TWFyayhjaGFubmVsSWQsIG1hcmspXFxcIiBqcXlvdWktZHJvcHBhYmxlPVxcXCJ7b25Ecm9wOlxcJ2ZpZWxkRHJvcHBlZFxcJ31cXFwiIGRhdGEtanF5b3VpLW9wdGlvbnM9XFxcInthY3RpdmVDbGFzczogXFwnZHJvcC1hY3RpdmVcXCd9XFxcIj48ZmllbGQtaW5mbyBuZy1zaG93PVxcXCJlbmNvZGluZ1tjaGFubmVsSWRdLmZpZWxkXFxcIiBuZy1jbGFzcz1cXFwieyBleHBhbmRlZDogZnVuY3NFeHBhbmRlZCwgYW55OiBpc0FueUZpZWxkLCBcXCdlbnVtZXJhdGVkLWZpZWxkXFwnOiBpc0VudW1lcmF0ZWRGaWVsZCwgXFwnZW51bWVyYXRlZC1jaGFubmVsXFwnOiBpc0VudW1lcmF0ZWRDaGFubmVsLCBoaWdobGlnaHRlZDogaXNIaWdobGlnaHRlZChjaGFubmVsSWQpIH1cXFwiIGZpZWxkLWRlZj1cXFwiZW5jb2RpbmdbY2hhbm5lbElkXVxcXCIgc2hvdy10eXBlPVxcXCJ0cnVlXFxcIiBzaG93LWNhcmV0PVxcXCJ0cnVlXFxcIiBkaXNhYmxlLWNvdW50LWNhcmV0PVxcXCJ0cnVlXFxcIiBwb3B1cC1jb250ZW50PVxcXCJmaWVsZEluZm9Qb3B1cENvbnRlbnRcXFwiIHNob3ctcmVtb3ZlPVxcXCJ0cnVlXFxcIiByZW1vdmUtYWN0aW9uPVxcXCJyZW1vdmVGaWVsZCgpXFxcIiBjbGFzcz1cXFwic2VsZWN0ZWQgZHJhZ2dhYmxlIGZ1bGwtd2lkdGhcXFwiIGRhdGEtZHJhZz1cXFwidHJ1ZVxcXCIgbmctbW9kZWw9XFxcInBpbGxzW2NoYW5uZWxJZF1cXFwiIGpxeW91aS1kcmFnZ2FibGU9XFxcIntvblN0YXJ0OiBcXCdmaWVsZERyYWdTdGFydFxcJywgb25TdG9wOlxcJ2ZpZWxkRHJhZ1N0b3BcXCd9XFxcIiBkYXRhLWpxeW91aS1vcHRpb25zPVxcXCJ7cmV2ZXJ0OiBcXCdpbnZhbGlkXFwnLCBoZWxwZXI6IFxcJ2Nsb25lXFwnfVxcXCI+PC9maWVsZC1pbmZvPjxzcGFuIGNsYXNzPVxcXCJwbGFjZWhvbGRlclxcXCIgbmctaWY9XFxcIiFlbmNvZGluZ1tjaGFubmVsSWRdLmZpZWxkXFxcIj5kcm9wIGEgZmllbGQgaGVyZTwvc3Bhbj48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJkcm9wLWNvbnRhaW5lclxcXCI+PGRpdiBjbGFzcz1cXFwicG9wdXAtbWVudSBzaGVsZi1wcm9wZXJ0aWVzIHNoZWxmLXByb3BlcnRpZXMte3tjaGFubmVsSWR9fVxcXCI+PC9kaXY+PGRpdiBjbGFzcz1cXFwicG9wdXAtbWVudSBzaGVsZi1mdW5jdGlvbnMgc2hlbGYtZnVuY3Rpb25zLXt7Y2hhbm5lbElkfX1cXFwiPjxmdW5jdGlvbi1zZWxlY3QgbmctaWY9XFxcIiFwcmV2aWV3XFxcIiBmaWVsZC1kZWY9XFxcImVuY29kaW5nW2NoYW5uZWxJZF1cXFwiIGNoYW5uZWwtaWQ9XFxcImNoYW5uZWxJZFxcXCI+PC9mdW5jdGlvbi1zZWxlY3Q+PGRpdiBjbGFzcz1cXFwibWI1XFxcIiBuZy1pZj1cXFwiYWxsb3dlZFR5cGVzLmxlbmd0aD4xXFxcIj48aDQ+VHlwZTwvaDQ+PGxhYmVsIGNsYXNzPVxcXCJ0eXBlLWxhYmVsXFxcIiBuZy1yZXBlYXQ9XFxcInR5cGUgaW4gYWxsb3dlZFR5cGVzXFxcIj48aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIG5nLXZhbHVlPVxcXCJ0eXBlXFxcIiBuZy1tb2RlbD1cXFwiZW5jb2RpbmdbY2hhbm5lbElkXS50eXBlXFxcIj4ge3t0eXBlfX08L2xhYmVsPjwvZGl2PjwvZGl2PjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvZmllbGRpbmZvL2ZpZWxkaW5mby5odG1sXCIsXCI8c3BhbiBjbGFzcz1cXFwiZmllbGQtaW5mb1xcXCI+PHNwYW4gY2xhc3M9XFxcImhmbGV4IGZ1bGwtd2lkdGhcXFwiIG5nLWNsaWNrPVxcXCJjbGlja2VkKCRldmVudClcXFwiPjxzcGFuIGNsYXNzPVxcXCJ0eXBlLWNhcmV0XFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTogIWRpc2FibGVDb3VudENhcmV0IHx8IGZpZWxkRGVmLmFnZ3JlZ2F0ZSE9PVxcJ2NvdW50XFwnfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWNhcmV0LWRvd25cXFwiIG5nLXNob3c9XFxcInNob3dDYXJldFxcXCI+PC9pPiA8c3BhbiBjbGFzcz1cXFwidHlwZSBmYSB7e2ljb259fVxcXCIgbmctc2hvdz1cXFwic2hvd1R5cGVcXFwiIHRpdGxlPVxcXCJ7e3R5cGVOYW1lfX1cXFwiPjwvc3Bhbj48L3NwYW4+IDxzcGFuIG5nLWlmPVxcXCJmaWVsZERlZi5hZ2dyZWdhdGUhPT1cXCdjb3VudFxcJ1xcXCIgY2xhc3M9XFxcImZpZWxkLWluZm8tdGV4dFxcXCI+PHNwYW4gbmctaWY9XFxcImZ1bmMoZmllbGREZWYpXFxcIiBjbGFzcz1cXFwiZmllbGQtZnVuY1xcXCIgdGl0bGU9XFxcInt7IGZ1bmMoZmllbGREZWYpIH19XFxcIiBuZy1jbGFzcz1cXFwie2FueTogZmllbGREZWYuX2FueX1cXFwiPnt7IGZ1bmMoZmllbGREZWYpIH19PC9zcGFuPjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1uYW1lXFxcIiBuZy1jbGFzcz1cXFwie2hhc2Z1bmM6IGZ1bmMoZmllbGREZWYpLCBhbnk6IGZpZWxkRGVmLl9hbnl9XFxcIj57eyAoZmllbGREZWYudGl0bGUgfHwgZmllbGREZWYuZmllbGQpIHwgdW5kZXJzY29yZTJzcGFjZSB9fTwvc3Bhbj48L3NwYW4+IDxzcGFuIG5nLWlmPVxcXCJmaWVsZERlZi5hZ2dyZWdhdGU9PT1cXCdjb3VudFxcJyB8fCBmaWVsZERlZi5hdXRvQ291bnRcXFwiIGNsYXNzPVxcXCJmaWVsZC1jb3VudCBmaWVsZC1pbmZvLXRleHRcXFwiPjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1uYW1lXFxcIj5DT1VOVDwvc3Bhbj48L3NwYW4+IDxzcGFuIGNsYXNzPVxcXCJuby1zaHJpbmsgcmVtb3ZlXFxcIiBuZy1zaG93PVxcXCJzaG93UmVtb3ZlXFxcIj48YSBjbGFzcz1cXFwicmVtb3ZlLWZpZWxkXFxcIiBuZy1jbGljaz1cXFwicmVtb3ZlQWN0aW9uKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10aW1lc1xcXCI+PC9pPjwvYT48L3NwYW4+IDxzcGFuIGNsYXNzPVxcXCJuby1zaHJpbmsgYWRkXFxcIiBuZy1zaG93PVxcXCJzaG93QWRkXFxcIj48YSBjbGFzcz1cXFwiYWRkLWZpZWxkXFxcIiBuZy1jbGljaz1cXFwiYWRkQWN0aW9uKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1wbHVzXFxcIj48L2k+PC9hPjwvc3Bhbj48L3NwYW4+PC9zcGFuPlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvZnVuY3Rpb25zZWxlY3QvZnVuY3Rpb25zZWxlY3QuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwibWI1XFxcIiBuZy1pZj1cXFwiZnVuYy5saXN0LmFib3ZlRm9sZC5sZW5ndGggPiAxIHx8IGZ1bmMubGlzdC5hYm92ZUZvbGRbMF0gIT09IHVuZGVmaW5lZFxcXCI+PGg0PkZ1bmN0aW9uPC9oND48ZGl2PjxsYWJlbCBjbGFzcz1cXFwiZnVuYy1sYWJlbCBmaWVsZC1mdW5jXFxcIiBuZy1yZXBlYXQ9XFxcImYgaW4gZnVuYy5saXN0LmFib3ZlRm9sZFxcXCIgbmctY2xhc3M9XFxcIntub25lOiAhZn1cXFwiPjxpbnB1dCB0eXBlPVxcXCJyYWRpb1xcXCIgbmctdmFsdWU9XFxcImZcXFwiIG5nLW1vZGVsPVxcXCJmdW5jLnNlbGVjdGVkXFxcIiBuZy1jaGFuZ2U9XFxcInNlbGVjdENoYW5nZWQoKVxcXCI+IHt7ZiB8fCBcXCdOT05FXFwnfX08L2xhYmVsPjwvZGl2PjxkaXYgbmctc2hvdz1cXFwic2hvd0FsbEZ1bmN0aW9uc1xcXCI+PGxhYmVsIGNsYXNzPVxcXCJmdW5jLWxhYmVsIGZpZWxkLWZ1bmNcXFwiIG5nLWNsYXNzPVxcXCJ7XFwnc2luZ2xlLWNvbHVtblxcJzogZnVuYy5pc1RlbXBvcmFsfVxcXCIgbmctcmVwZWF0PVxcXCJmIGluIGZ1bmMubGlzdC5iZWxvd0ZvbGRcXFwiPjxpbnB1dCB0eXBlPVxcXCJyYWRpb1xcXCIgbmctdmFsdWU9XFxcImZcXFwiIG5nLW1vZGVsPVxcXCJmdW5jLnNlbGVjdGVkXFxcIiBuZy1jaGFuZ2U9XFxcInNlbGVjdENoYW5nZWQoKVxcXCI+IHt7Zn19PC9sYWJlbD48L2Rpdj48ZGl2IG5nLWhpZGU9XFxcImZ1bmMuaXNDb3VudCB8fCBmdW5jLmxpc3QuYmVsb3dGb2xkLmxlbmd0aCA9PSAwXFxcIiBjbGFzcz1cXFwiZXhwYW5kLWNvbGxhcHNlXFxcIj48YSBuZy1jbGljaz1cXFwic2hvd0FsbEZ1bmN0aW9ucz0hc2hvd0FsbEZ1bmN0aW9uc1xcXCI+PHNwYW4gbmctc2hvdz1cXFwiIXNob3dBbGxGdW5jdGlvbnNcXFwiPm1vcmUgPGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLWRvd25cXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L2k+PC9zcGFuPiA8c3BhbiBuZy1zaG93PVxcXCJzaG93QWxsRnVuY3Rpb25zXFxcIj5sZXNzIDxpIGNsYXNzPVxcXCJmYSBmYS1hbmdsZS11cFxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvaT48L3NwYW4+PC9hPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvbW9kYWwvbW9kYWwuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwibW9kYWxcXFwiIG5nLWlmPVxcXCJpc09wZW5cXFwiPjxkaXYgY2xhc3M9XFxcIm1vZGFsLXdyYXBwZXJcXFwiIHN0eWxlPVxcXCJ7e3dyYXBwZXJTdHlsZX19XFxcIiBuZy10cmFuc2NsdWRlPVxcXCJcXFwiPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvbW9kYWwvbW9kYWxjbG9zZWJ1dHRvbi5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJyaWdodFxcXCI+PGEgbmctY2xpY2s9XFxcImNsb3NlTW9kYWwoKVxcXCIgY2xhc3M9XFxcInJpZ2h0XFxcIj5DbG9zZTwvYT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL3Byb3BlcnR5ZWRpdG9yL3Byb3BlcnR5ZWRpdG9yLmh0bWxcIixcIjxkaXY+PGxhYmVsIGNsYXNzPVxcXCJwcm9wLWxhYmVsXFxcIiBmb3I9XFxcInt7IGlkIH19XFxcIj48c3BhbiBjbGFzcz1cXFwibmFtZVxcXCIgdGl0bGU9XFxcInt7IHByb3BOYW1lIH19XFxcIj57eyBwcm9wTmFtZSB9fTwvc3Bhbj4gPHNwYW4gbmctaWY9XFxcImRlc2NyaXB0aW9uXFxcIiBjbGFzcz1cXFwiZmEgZmEtaW5mby1jaXJjbGVcXFwiIHRvb2x0aXBzPVxcXCJcXFwiIHRvb2x0aXAtc2l6ZT1cXFwic21hbGxcXFwiIHRvb2x0aXAtaHRtbD1cXFwiPHN0cm9uZz57eyBwcm9wTmFtZSB9fTwvc3Ryb25nPjxkaXYgY2xhc3M9XFwndG9vbHRpcC1jb250ZW50XFwnPnt7IGRlc2NyaXB0aW9uIH19PC9kaXY+XFxcIiB0b29sdGlwLXNpZGU9XFxcInJpZ2h0XFxcIj48L3NwYW4+PC9sYWJlbD48Zm9ybSBjbGFzcz1cXFwiaW5saW5lLWJsb2NrXFxcIiBuZy1zd2l0Y2g9XFxcInR5cGUgKyAoZW51bSAhPT0gdW5kZWZpbmVkID8gXFwnbGlzdFxcJyA6IFxcJ1xcJylcXFwiPjxpbnB1dCBpZD1cXFwie3sgaWQgfX1cXFwiIG5nLXN3aXRjaC13aGVuPVxcXCJib29sZWFuXFxcIiB0eXBlPVxcXCJjaGVja2JveFxcXCIgbmctbW9kZWw9XFxcImdyb3VwW3Byb3BOYW1lXVxcXCIgbmctaGlkZT1cXFwiYXV0b21vZGVsLnZhbHVlXFxcIj48c2VsZWN0IGlkPVxcXCJ7eyBpZCB9fVxcXCIgbmctc3dpdGNoLXdoZW49XFxcInN0cmluZ2xpc3RcXFwiIG5nLW1vZGVsPVxcXCJncm91cFtwcm9wTmFtZV1cXFwiIG5nLW9wdGlvbnM9XFxcImNob2ljZSBmb3IgY2hvaWNlIGluIGVudW0gdHJhY2sgYnkgY2hvaWNlXFxcIiBuZy1oaWRlPVxcXCJhdXRvbW9kZWwudmFsdWVcXFwiPjwvc2VsZWN0PjxpbnB1dCBpZD1cXFwie3sgaWQgfX1cXFwiIG5nLXN3aXRjaC13aGVuPVxcXCJpbnRlZ2VyXFxcIiBuZy1hdHRyLXR5cGU9XFxcInt7IGlzUmFuZ2UgPyBcXCdyYW5nZVxcJyA6IFxcJ251bWJlclxcJ319XFxcIiBuZy1tb2RlbD1cXFwiZ3JvdXBbcHJvcE5hbWVdXFxcIiBuZy1tb2RlbC1vcHRpb25zPVxcXCJ7ZGVib3VuY2U6IDIwMH1cXFwiIG5nLWF0dHItbWluPVxcXCJ7e21pbn19XFxcIiBuZy1hdHRyLW1heD1cXFwie3ttYXh9fVxcXCIgbmctaGlkZT1cXFwiYXV0b21vZGVsLnZhbHVlXFxcIiBuZy1hdHRyLXRpdGxlPVxcXCJ7eyBpc1JhbmdlID8gZ3JvdXBbcHJvcE5hbWVdIDogdW5kZWZpbmVkIH19XFxcIj4gPGlucHV0IGlkPVxcXCJ7eyBpZCB9fVxcXCIgbmctYXR0ci10eXBlPVxcXCJ7eyByb2xlID09PSBcXCdjb2xvclxcJyA/IFxcJ2NvbG9yXFwnIDogXFwnc3RyaW5nXFwnIH19XFxcIiBuZy1zd2l0Y2gtd2hlbj1cXFwic3RyaW5nXFxcIiBuZy1tb2RlbD1cXFwiZ3JvdXBbcHJvcE5hbWVdXFxcIiBuZy1tb2RlbC1vcHRpb25zPVxcXCJ7ZGVib3VuY2U6IDUwMH1cXFwiIG5nLWhpZGU9XFxcImF1dG9tb2RlbC52YWx1ZVxcXCI+IDxzbWFsbCBuZy1pZj1cXFwiaGFzQXV0b1xcXCI+PGxhYmVsPkF1dG8gPGlucHV0IG5nLW1vZGVsPVxcXCJhdXRvbW9kZWwudmFsdWVcXFwiIHR5cGU9XFxcImNoZWNrYm94XFxcIj48L2xhYmVsPjwvc21hbGw+PC9mb3JtPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvc2NoZW1hbGlzdC9zY2hlbWFsaXN0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInNjaGVtYSBuby10b3AtbWFyZ2luIGZ1bGwtd2lkdGhcXFwiPjxzY2hlbWEtbGlzdC1pdGVtIG5nLXJlcGVhdD1cXFwiZmllbGREZWYgaW4gZmllbGREZWZzIHwgb3JkZXJCeSA6IG9yZGVyQnlcXFwiIGZpZWxkLWRlZj1cXFwiZmllbGREZWZcXFwiIHNob3ctYWRkPVxcXCJzaG93QWRkXFxcIj48L3NjaGVtYS1saXN0LWl0ZW0+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9zY2hlbWFsaXN0L3NjaGVtYWxpc3RpdGVtLmh0bWxcIixcIjxmaWVsZC1pbmZvIGZpZWxkLWRlZj1cXFwiZmllbGREZWZcXFwiIHNob3ctdHlwZT1cXFwidHJ1ZVxcXCIgc2hvdy1hZGQ9XFxcInNob3dBZGRcXFwiIGNsYXNzPVxcXCJwaWxsIGxpc3QtaXRlbSBkcmFnZ2FibGUgZnVsbC13aWR0aCBuby1yaWdodC1tYXJnaW5cXFwiIG5nLWNsYXNzPVxcXCJ7YW55OiBpc0VudW1TcGVjKGZpZWxkRGVmLmZpZWxkKX1cXFwiIG5nLW1vZGVsPVxcXCJwaWxsXFxcIiBuZy1kYmxjbGljaz1cXFwiZmllbGRBZGQoZmllbGREZWYpXFxcIiBhZGQtYWN0aW9uPVxcXCJmaWVsZEFkZChmaWVsZERlZilcXFwiIGRhdGEtZHJhZz1cXFwidHJ1ZVxcXCIganF5b3VpLWRyYWdnYWJsZT1cXFwie3BsYWNlaG9sZGVyOiBcXCdrZWVwXFwnLCBkZWVwQ29weTogdHJ1ZSwgb25TdGFydDogXFwnZmllbGREcmFnU3RhcnRcXCcsIG9uU3RvcDpcXCdmaWVsZERyYWdTdG9wXFwnfVxcXCIgZGF0YS1qcXlvdWktb3B0aW9ucz1cXFwie3JldmVydDogXFwnaW52YWxpZFxcJywgaGVscGVyOiBcXCdjbG9uZVxcJ31cXFwiPjwvZmllbGQtaW5mbz5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL3NoZWx2ZXMvc2hlbHZlcy5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJjYXJkIHNoZWx2ZXMgbm8tdG9wLW1hcmdpbiBuby1yaWdodC1tYXJnaW4gYWJzLTEwMFxcXCI+PGEgY2xhc3M9XFxcInJpZ2h0XFxcIiBuZy1jbGljaz1cXFwiY2xlYXIoKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWVyYXNlclxcXCI+PC9pPiBDbGVhcjwvYT48aDI+RW5jb2Rpbmc8L2gyPjxkaXYgY2xhc3M9XFxcInNoZWxmLXBhbmUgc2hlbGYtZW5jb2RpbmctcGFuZSBmdWxsLXdpZHRoXFxcIj48aDM+UG9zaXRpb25hbDwvaDM+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwneFxcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCI+PC9jaGFubmVsLXNoZWxmPjxjaGFubmVsLXNoZWxmIGNoYW5uZWwtaWQ9XFxcIlxcJ3lcXCdcXFwiIHByZXZpZXc9XFxcInByZXZpZXdcXFwiIGVuY29kaW5nPVxcXCJzcGVjLmVuY29kaW5nXFxcIiBtYXJrPVxcXCJzcGVjLm1hcmtcXFwiPjwvY2hhbm5lbC1zaGVsZj48Y2hhbm5lbC1zaGVsZiBjaGFubmVsLWlkPVxcXCJcXCdjb2x1bW5cXCdcXFwiIHByZXZpZXc9XFxcInByZXZpZXdcXFwiIGVuY29kaW5nPVxcXCJzcGVjLmVuY29kaW5nXFxcIiBtYXJrPVxcXCJzcGVjLm1hcmtcXFwiIGRpc2FibGVkPVxcXCIhc3BlYy5lbmNvZGluZy54LmZpZWxkXFxcIj4+PC9jaGFubmVsLXNoZWxmPjxjaGFubmVsLXNoZWxmIGNoYW5uZWwtaWQ9XFxcIlxcJ3Jvd1xcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCIgZGlzYWJsZWQ9XFxcIiFzcGVjLmVuY29kaW5nLnkuZmllbGRcXFwiPjwvY2hhbm5lbC1zaGVsZj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJzaGVsZi1wYW5lIHNoZWxmLW1hcmtzLXBhbmUgZnVsbC13aWR0aFxcXCI+PGRpdiBjbGFzcz1cXFwicmlnaHRcXFwiPjxzZWxlY3QgY2xhc3M9XFxcIm1hcmtzZWxlY3RcXFwiIG5nLW1vZGVsPVxcXCJzcGVjLm1hcmtcXFwiIG5nLWNsYXNzPVxcXCJ7YXV0bzogc3BlYy5tYXJrID09PSBBTll9XFxcIiBuZy1vcHRpb25zPVxcXCIodHlwZSA9PT0gQU5ZID8gXFwnYXV0b1xcJyA6IHR5cGUpIGZvciB0eXBlIGluIChzdXBwb3J0QW55ID8gbWFya3NXaXRoQW55IDogbWFya3MpXFxcIiBuZy1jaGFuZ2U9XFxcIm1hcmtDaGFuZ2UoKVxcXCI+PC9zZWxlY3Q+PC9kaXY+PGgzPk1hcmtzPC9oMz48Y2hhbm5lbC1zaGVsZiBjaGFubmVsLWlkPVxcXCJcXCdzaXplXFwnXFxcIiBwcmV2aWV3PVxcXCJwcmV2aWV3XFxcIiBlbmNvZGluZz1cXFwic3BlYy5lbmNvZGluZ1xcXCIgbWFyaz1cXFwic3BlYy5tYXJrXFxcIj48L2NoYW5uZWwtc2hlbGY+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwnY29sb3JcXCdcXFwiIHByZXZpZXc9XFxcInByZXZpZXdcXFwiIGVuY29kaW5nPVxcXCJzcGVjLmVuY29kaW5nXFxcIiBtYXJrPVxcXCJzcGVjLm1hcmtcXFwiPjwvY2hhbm5lbC1zaGVsZj48Y2hhbm5lbC1zaGVsZiBjaGFubmVsLWlkPVxcXCJcXCdzaGFwZVxcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCI+PC9jaGFubmVsLXNoZWxmPjxjaGFubmVsLXNoZWxmIGNoYW5uZWwtaWQ9XFxcIlxcJ2RldGFpbFxcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCI+PC9jaGFubmVsLXNoZWxmPjxjaGFubmVsLXNoZWxmIGNoYW5uZWwtaWQ9XFxcIlxcJ3RleHRcXCdcXFwiIHByZXZpZXc9XFxcInByZXZpZXdcXFwiIGVuY29kaW5nPVxcXCJzcGVjLmVuY29kaW5nXFxcIiBtYXJrPVxcXCJzcGVjLm1hcmtcXFwiPjwvY2hhbm5lbC1zaGVsZj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJzaGVsZi1wYW5lIHNoZWxmLWFueS1wYW5lIGZ1bGwtd2lkdGhcXFwiIG5nLWlmPVxcXCJzdXBwb3J0QW55ICYmICFwcmV2aWV3XFxcIj48aDM+QXV0b21hdGljPC9oMz48Y2hhbm5lbC1zaGVsZiBuZy1yZXBlYXQ9XFxcImNoYW5uZWxJZCBpbiBhbnlDaGFubmVsSWRzXFxcIiBwcmV2aWV3PVxcXCJwcmV2aWV3XFxcIiBjaGFubmVsLWlkPVxcXCJjaGFubmVsSWRcXFwiIGVuY29kaW5nPVxcXCJzcGVjLmVuY29kaW5nXFxcIiBtYXJrPVxcXCJzcGVjLm1hcmtcXFwiPjwvY2hhbm5lbC1zaGVsZj48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL3RhYnMvdGFiLmh0bWxcIixcIjxkaXYgbmctaWY9XFxcImFjdGl2ZVxcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL3RhYnMvdGFic2V0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInRhYi1jb250YWluZXJcXFwiPjxkaXY+PGEgY2xhc3M9XFxcInRhYlxcXCIgbmctcmVwZWF0PVxcXCJ0YWIgaW4gdGFic2V0LnRhYnNcXFwiIG5nLWNsYXNzPVxcXCJ7XFwnYWN0aXZlXFwnOiB0YWIuYWN0aXZlfVxcXCIgbmctY2xpY2s9XFxcInRhYnNldC5zaG93VGFiKHRhYilcXFwiPnt7dGFiLmhlYWRpbmd9fTwvYT48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ0YWItY29udGVudHNcXFwiIG5nLXRyYW5zY2x1ZGU9XFxcIlxcXCI+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy92bHBsb3QvdmxwbG90Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInZsLXBsb3RcXFwiIGlkPVxcXCJ2aXMte3t2aXNJZH19XFxcIiBuZy1jbGFzcz1cXFwieyBmaXQ6ICFhbHdheXNTY3JvbGxhYmxlICYmICFvdmVyZmxvdyAmJiAobWF4SGVpZ2h0ICYmICghaGVpZ2h0IHx8IGhlaWdodCA8PSBtYXhIZWlnaHQpKSAmJiAobWF4V2lkdGggJiYgKCF3aWR0aCB8fCB3aWR0aCA8PSBtYXhXaWR0aCkpLCBvdmVyZmxvdzogYWx3YXlzU2Nyb2xsYWJsZSB8fCBvdmVyZmxvdyB8fCAobWF4SGVpZ2h0ICYmIGhlaWdodCAmJiBoZWlnaHQgPiBtYXhIZWlnaHQpIHx8IChtYXhXaWR0aCAmJiB3aWR0aCAmJiB3aWR0aCA+IG1heFdpZHRoKSwgc2Nyb2xsOiBhbHdheXNTY3JvbGxhYmxlIHx8IHVubG9ja2VkIHx8IGhvdmVyRm9jdXMgfVxcXCIgbmctbW91c2Vkb3duPVxcXCJ1bmxvY2tlZD0hdGh1bWJuYWlsXFxcIiBuZy1tb3VzZXVwPVxcXCJ1bmxvY2tlZD1mYWxzZVxcXCIgbmctbW91c2VvdmVyPVxcXCJtb3VzZW92ZXIoKVxcXCIgbmctbW91c2VvdXQ9XFxcIm1vdXNlb3V0KClcXFwiPjxkaXYgY2xhc3M9XFxcInZpcy10b29sdGlwXFxcIiBuZy1zaG93PVxcXCJ0b29sdGlwQWN0aXZlXFxcIj48dGFibGU+PHRyIG5nLXJlcGVhdD1cXFwicCBpbiBkYXRhXFxcIj48dGQgY2xhc3M9XFxcImtleVxcXCI+e3twWzBdfX08L3RkPjx0ZCBjbGFzcz1cXFwidmFsdWVcXFwiPjxiPnt7cFsxXX19PC9iPjwvdGQ+PC90cj48L3RhYmxlPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvdmxwbG90Z3JvdXAvdmxwbG90Z3JvdXAuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwidmwtcGxvdC1ncm91cCB2ZmxleFxcXCI+PGRpdiBuZy1zaG93PVxcXCJzaG93RXhwYW5kIHx8IGZpZWxkU2V0IHx8IHNob3dUcmFuc3Bvc2UgfHwgc2hvd0Jvb2ttYXJrICYmIEJvb2ttYXJrcy5pc1N1cHBvcnRlZCB8fCBzaG93VG9nZ2xlXFxcIiBjbGFzcz1cXFwidmwtcGxvdC1ncm91cC1oZWFkZXIgbm8tc2hyaW5rXFxcIj48ZGl2IGNsYXNzPVxcXCJmaWVsZC1zZXQtaW5mb1xcXCI+PGZpZWxkLWluZm8gbmctcmVwZWF0PVxcXCJmaWVsZERlZiBpbiBmaWVsZFNldFxcXCIgbmctaWY9XFxcImZpZWxkU2V0ICYmIChmaWVsZERlZi5maWVsZCB8fCBmaWVsZERlZi5hdXRvQ291bnQpXFxcIiBmaWVsZC1kZWY9XFxcImZpZWxkRGVmXFxcIiBlbnVtLXNwZWMtaW5kZXg9XFxcImNoYXJ0LmVudW1TcGVjSW5kZXhcXFwiIHNob3ctdHlwZT1cXFwidHJ1ZVxcXCIgbmctY2xhc3M9XFxcInsgc2VsZWN0ZWQ6IGFsd2F5c1NlbGVjdGVkIHx8IChpc1NlbGVjdGVkICYmIGlzU2VsZWN0ZWQoZmllbGREZWYuZmllbGQpKSwgdW5zZWxlY3RlZDogaXNTZWxlY3RlZCAmJiAhaXNTZWxlY3RlZChmaWVsZERlZi5maWVsZCksIGhpZ2hsaWdodGVkOiAoaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZERlZi5maWVsZF0sIFxcJ2VudW1lcmF0ZWQtZmllbGRcXCc6IGlzRW51bWVyYXRlZEZpZWxkKGNoYXJ0LCAkaW5kZXgpLCBcXCdlbnVtZXJhdGVkLWNoYW5uZWxcXCc6IGlzRW51bWVyYXRlZENoYW5uZWwoY2hhcnQsICRpbmRleCkgfVxcXCIgbmctbW91c2VvdmVyPVxcXCJmaWVsZEluZm9Nb3VzZW92ZXIoZmllbGREZWYsICRpbmRleClcXFwiIG5nLW1vdXNlb3V0PVxcXCJmaWVsZEluZm9Nb3VzZW91dChmaWVsZERlZiwgJGluZGV4KVxcXCI+PC9maWVsZC1pbmZvPjwvZGl2PjxkaXYgY2xhc3M9XFxcInRvb2xib3hcXFwiPjxhIG5nLWlmPVxcXCJjb25zdHMuZGVidWcgJiYgc2hvd0RlYnVnXFxcIiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXdyZW5jaFxcXCIgbmctY2xpY2s9XFxcInNoQ29waWVkPVxcJ1xcJzsgdmxDb3BpZWQ9XFwnXFwnOyB2Z0NvcGllZD1cXCdcXCc7XFxcIiBuZy1tb3VzZW92ZXI9XFxcImluaXRpYWxpemVQb3B1cCgpO1xcXCI+PC9pPjwvYT48dmwtcGxvdC1ncm91cC1wb3B1cCBuZy1pZj1cXFwiY29uc3RzLmRlYnVnICYmIHNob3dEZWJ1ZyAmJiByZW5kZXJQb3B1cFxcXCI+PC92bC1wbG90LWdyb3VwLXBvcHVwPjxhIG5nLWlmPVxcXCJzaG93TG9nICYmIGNoYXJ0LnZsU3BlYyAmJiBsb2cuc3VwcG9ydChjaGFydC52bFNwZWMsIFxcJ3hcXCcpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgdGl0bGU9XFxcIlRvZ2dsZSBYLVNjYWxlXFxcIiBuZy1jbGljaz1cXFwibG9nLnRvZ2dsZShjaGFydC52bFNwZWMsIFxcJ3hcXCcpXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTogbG9nLmFjdGl2ZShjaGFydC52bFNwZWMsIFxcJ3hcXCcpfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWxvbmctYXJyb3ctcmlnaHRcXFwiPjwvaT4gPHNtYWxsPkxvZyBYPC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93TG9nICYmIGNoYXJ0LnZsU3BlYyAmJiBsb2cuc3VwcG9ydChjaGFydC52bFNwZWMsIFxcJ3lcXCcpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgdGl0bGU9XFxcIlRvZ2dsZSBZLVNjYWxlXFxcIiBuZy1jbGljaz1cXFwibG9nLnRvZ2dsZShjaGFydC52bFNwZWMsIFxcJ3lcXCcpXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTogbG9nLmFjdGl2ZShjaGFydC52bFNwZWMsIFxcJ3lcXCcpfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWxvbmctYXJyb3ctdXBcXFwiPjwvaT4gPHNtYWxsPkxvZyBZPC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93U29ydCAmJiBjaGFydC52bFNwZWMgJiYgdG9nZ2xlU29ydC5zdXBwb3J0KGNoYXJ0LnZsU3BlYylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwidG9nZ2xlU29ydC50b2dnbGUoY2hhcnQudmxTcGVjKVxcXCIgdGl0bGU9XFxcIlNvcnRcXFwiPjxpIGNsYXNzPVxcXCJmYSBzb3J0XFxcIiBuZy1jbGFzcz1cXFwidG9nZ2xlU29ydENsYXNzKGNoYXJ0LnZsU3BlYylcXFwiPjwvaT4gPHNtYWxsIG5nLWlmPVxcXCJzaG93TGFiZWxcXFwiPlNvcnQ8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dGaWx0ZXJOdWxsICYmIGNoYXJ0LnZsU3BlYyAmJiB0b2dnbGVGaWx0ZXJOdWxsLnN1cHBvcnQoY2hhcnQudmxTcGVjKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJ0b2dnbGVGaWx0ZXJOdWxsKGNoYXJ0LnZsU3BlYylcXFwiIHRpdGxlPVxcXCJGaWx0ZXIgTnVsbFxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6IGNoYXJ0LnZsU3BlYyAmJiAoY2hhcnQudmxTcGVjLnRyYW5zZm9ybXx8e30pLmZpbHRlckludmFsaWR9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZmlsdGVyXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5GaWx0ZXI8L3NtYWxsPiA8c21hbGw+TlVMTDwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd1RyYW5zcG9zZVxcXCIgdGl0bGU9XFxcIlN3YXAgWC9ZXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcInRyYW5zcG9zZSgpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcmVmcmVzaCB0cmFuc3Bvc2VcXFwiPjwvaT4gPHNtYWxsIG5nLWlmPVxcXCJzaG93TGFiZWxcXFwiPlN3YXAgWC9ZPC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93Qm9va21hcmsgJiYgQm9va21hcmtzLmlzU3VwcG9ydGVkXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgdGl0bGU9XFxcIkJvb2ttYXJrXFxcIiBuZy1jbGljaz1cXFwidG9nZ2xlQm9va21hcmsoY2hhcnQpXFxcIiBuZy1jbGFzcz1cXFwie2Rpc2FibGVkOiAhY2hhcnQudmxTcGVjLmVuY29kaW5nLCBhY3RpdmU6IEJvb2ttYXJrcy5pc0Jvb2ttYXJrZWQoY2hhcnQuc2hvcnRoYW5kKX1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1ib29rbWFya1xcXCI+PC9pPiA8c21hbGwgbmctaWY9XFxcInNob3dMYWJlbFxcXCI+Qm9va21hcms8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dFeHBhbmRcXFwiIG5nLWNsaWNrPVxcXCJleHBhbmRBY3Rpb24oKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1leHBhbmRcXFwiPjwvaT48L2E+IDxhIG5nLWlmPVxcXCJzaG93U2VsZWN0XFxcIiB0aXRsZT1cXFwiU2V0IGVuY29kaW5nIHRvIHRoaXMgY2hhcnRcXFwiIG5nLWNsaWNrPVxcXCJzZWxlY3RBY3Rpb24oKVxcXCIgY2xhc3M9XFxcImNvbW1hbmQgc2VsZWN0XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtc2VydmVyXFxcIj48L2k+PC9hPjxkaXYgbmctaWY9XFxcInNob3dCb29rbWFya0FsZXJ0XFxcIiBjbGFzcz1cXFwiYm9va21hcmstYWxlcnRcXFwiPjxkaXY+UmVtb3ZlIGJvb2ttYXJrPzwvZGl2PjxzbWFsbD5Zb3VyIG5vdGVzIHdpbGwgYmUgbG9zdC48L3NtYWxsPjxkaXY+PGEgbmctY2xpY2s9XFxcInJlbW92ZUJvb2ttYXJrKGNoYXJ0KVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRyYXNoLW9cXFwiPjwvaT4gcmVtb3ZlIGl0PC9hPiA8YSBuZy1jbGljaz1cXFwia2VlcEJvb2ttYXJrKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1ib29rbWFya1xcXCI+PC9pPiBrZWVwIGl0PC9hPjwvZGl2PjwvZGl2PjwvZGl2PjwvZGl2Pjx2bC1wbG90IGNsYXNzPVxcXCJmbGV4LWdyb3ctMVxcXCIgY2hhcnQ9XFxcImNoYXJ0XFxcIiBkaXNhYmxlZD1cXFwiZGlzYWJsZWRcXFwiIGlzLWluLWxpc3Q9XFxcImlzSW5MaXN0XFxcIiBsaXN0LXRpdGxlPVxcXCJsaXN0VGl0bGVcXFwiIGFsd2F5cy1zY3JvbGxhYmxlPVxcXCJhbHdheXNTY3JvbGxhYmxlXFxcIiBjb25maWctc2V0PVxcXCJ7e2NvbmZpZ1NldHx8XFwnc21hbGxcXCd9fVxcXCIgbWF4LWhlaWdodD1cXFwibWF4SGVpZ2h0XFxcIiBtYXgtd2lkdGg9XFxcIm1heFdpZHRoXFxcIiBvdmVyZmxvdz1cXFwib3ZlcmZsb3dcXFwiIHByaW9yaXR5PVxcXCJwcmlvcml0eVxcXCIgcmVzY2FsZT1cXFwicmVzY2FsZVxcXCIgdGh1bWJuYWlsPVxcXCJ0aHVtYm5haWxcXFwiIHRvb2x0aXA9XFxcInRvb2x0aXBcXFwiPjwvdmwtcGxvdD48dGV4dGFyZWEgY2xhc3M9XFxcImFubm90YXRpb25cXFwiIG5nLWlmPVxcXCJCb29rbWFya3MuaXNCb29rbWFya2VkKGNoYXJ0LnNob3J0aGFuZClcXFwiIG5nLW1vZGVsPVxcXCJCb29rbWFya3MuZGljdFtjaGFydC5zaG9ydGhhbmRdLmFubm90YXRpb25cXFwiIG5nLWNoYW5nZT1cXFwiQm9va21hcmtzLnNhdmVBbm5vdGF0aW9ucyhjaGFydC5zaG9ydGhhbmQpXFxcIiBwbGFjZWhvbGRlcj1cXFwibm90ZXNcXFwiPjwvdGV4dGFyZWE+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy92bHBsb3Rncm91cC92bHBsb3Rncm91cHBvcHVwLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImRyb3AtY29udGFpbmVyXFxcIj48ZGl2IGNsYXNzPVxcXCJwb3B1cC1tZW51IHBvcHVwLWNvbW1hbmQgbm8tc2hyaW5rIGRldi10b29sXFxcIj48ZGl2IGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIj48c3BhbiBjbGFzcz1cXFwiZGVidWdcXFwiPlZsPC9zcGFuPiA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIHVpLXplcm9jbGlwPVxcXCJcXFwiIHplcm9jbGlwLWNvcGllZD1cXFwidmxDb3BpZWQ9XFwnKENvcGllZClcXCdcXFwiIHplcm9jbGlwLW1vZGVsPVxcXCJjaGFydC5jbGVhblNwZWMgfCBjb21wYWN0SlNPTlxcXCI+Q29weTwvYT4gLyA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIG5nLWNsaWNrPVxcXCJsb2dDb2RlKFxcJ1ZlZ2EtTGl0ZVxcJywgY2hhcnQuY2xlYW5TcGVjKTsgdmxDb3BpZWQ9XFwnKExvZ2dlZClcXCc7XFxcIj5Mb2c8L2E+IDxzcGFuPnt7dmxDb3BpZWR9fTwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIj48c3BhbiBjbGFzcz1cXFwiZGVidWdcXFwiPlZnPC9zcGFuPiA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIHVpLXplcm9jbGlwPVxcXCJcXFwiIHplcm9jbGlwLWNvcGllZD1cXFwidmdDb3BpZWQ9XFwnKENvcGllZClcXCdcXFwiIHplcm9jbGlwLW1vZGVsPVxcXCJjaGFydC52Z1NwZWMgfCBjb21wYWN0SlNPTlxcXCI+Q29weTwvYT4gLyA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIG5nLWNsaWNrPVxcXCJsb2dDb2RlKFxcJ1ZlZ2FcXCcsIGNoYXJ0LnZnU3BlYyk7IHZnQ29waWVkPVxcJyhMb2dnZWQpXFwnO1xcXCI+TG9nPC9hPiA8c3Bhbj57e3ZnQ29waWVkfX08L3NwYW4+PC9kaXY+PGEgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiIG5nLWhyZWY9XFxcInt7IHt0eXBlOlxcJ3ZsXFwnLCBzcGVjOiBjaGFydC5jbGVhblNwZWN9IHwgcmVwb3J0VXJsIH19XFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+UmVwb3J0IEJhZCBSZW5kZXI8L2E+IDxhIG5nLWNsaWNrPVxcXCJzaG93RmVhdHVyZT0hc2hvd0ZlYXR1cmVcXFwiIGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIj57e2NoYXJ0LnNjb3JlfX08L2E+PGRpdiBuZy1yZXBlYXQ9XFxcImYgaW4gY2hhcnQuc2NvcmVGZWF0dXJlcyB0cmFjayBieSBmLnJlYXNvblxcXCI+W3t7Zi5zY29yZX19XSB7e2YucmVhc29ufX08L2Rpdj48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL3ZscGxvdGdyb3VwbGlzdC92bHBsb3Rncm91cGxpc3QuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwidmwtcGxvdC1ncm91cC1saXN0LWNvbnRhaW5lclxcXCI+PGRpdiBjbGFzcz1cXFwidmlzLWxpc3QtaGVhZGVyXFxcIiBuZy1zaG93PVxcXCJsaXN0VGl0bGUgJiYgIWhpZGVMaXN0VGl0bGVcXFwiPjxoMz57e2xpc3RUaXRsZX19PC9oMz48c3BhbiBjbGFzcz1cXFwiZGVzY3JpcHRpb25cXFwiPjwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ2aXMtbGlzdCBoZmxleCBmbGV4LXdyYXBcXFwiPjx2bC1wbG90LWdyb3VwIG5nLXJlcGVhdD1cXFwiY2hhcnQgaW4gY2hhcnRzIHwgbGltaXRUbzogbGltaXRcXFwiIGNsYXNzPVxcXCJ3cmFwcGVkLXZsLXBsb3QtZ3JvdXAgY2FyZFxcXCIgY2hhcnQ9XFxcImNoYXJ0XFxcIiBpcy1pbi1saXN0PVxcXCJpc0luTGlzdFxcXCIgbGlzdC10aXRsZT1cXFwibGlzdFRpdGxlXFxcIiBlbmFibGUtcGlsbHMtcHJldmlldz1cXFwiZW5hYmxlUGlsbHNQcmV2aWV3XFxcIiBmaWVsZC1zZXQ9XFxcImNoYXJ0LmZpZWxkU2V0XFxcIiBzaG93LWJvb2ttYXJrPVxcXCJ0cnVlXFxcIiBzaG93LWRlYnVnPVxcXCJjb25zdHMuZGVidWcgJiYgY29uc3RzLmRlYnVnSW5MaXN0XFxcIiBzaG93LXNlbGVjdD1cXFwidHJ1ZVxcXCIgc2hvdy1maWx0ZXItbnVsbD1cXFwidHJ1ZVxcXCIgc2hvdy1sb2c9XFxcInRydWVcXFwiIHNob3ctc29ydD1cXFwidHJ1ZVxcXCIgb3ZlcmZsb3c9XFxcInRydWVcXFwiIHRvb2x0aXA9XFxcInRydWVcXFwiIGhpZ2hsaWdodGVkPVxcXCJQaWxscy5oaWdobGlnaHRlZFxcXCIgc2VsZWN0LWFjdGlvbj1cXFwic2VsZWN0KGNoYXJ0KVxcXCIgcHJpb3JpdHk9XFxcInByaW9yaXR5ICsgJGluZGV4XFxcIj48L3ZsLXBsb3QtZ3JvdXA+PC9kaXY+PGEgbmctY2xpY2s9XFxcImluY3JlYXNlTGltaXQoKVxcXCI+PGRpdiBjbGFzcz1cXFwidmlzLWxpc3QtbW9yZVxcXCIgbmctc2hvdz1cXFwibGltaXQgPCBjaGFydHMubGVuZ3RoXFxcIj5Mb2FkIG1vcmUuLi48L2Rpdj48L2E+PC9kaXY+XCIpO31dKTsiLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6YWRkTXlyaWFEYXRhc2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgYWRkTXlyaWFEYXRhc2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnYWRkTXlyaWFEYXRhc2V0JywgZnVuY3Rpb24gKCRodHRwLCBEYXRhc2V0LCBjb25zdHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2FkZG15cmlhZGF0YXNldC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnP15ebW9kYWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgLy8gSWYgdGhpcyBkaXJlY3RpdmUgb2NjdXJzIHdpdGhpbiBhIGEgbW9kYWwsIGdpdmUgb3Vyc2VsdmVzIGEgd2F5IHRvIGNsb3NlXG4gICAgICAgIC8vIHRoYXQgbW9kYWwgb25jZSB0aGUgYWRkIGJ1dHRvbiBoYXMgYmVlbiBjbGlja2VkXG4gICAgICAgIGZ1bmN0aW9uIGNsb3NlTW9kYWwoKSB7XG4gICAgICAgICAgaWYgKG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAgICAgbW9kYWxDb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzY29wZSB2YXJpYWJsZXNcbiAgICAgICAgc2NvcGUubXlyaWFSZXN0VXJsID0gY29uc3RzLm15cmlhUmVzdDtcbiAgICAgICAgc2NvcGUubXlyaWFEYXRhc2V0cyA9IFtdO1xuICAgICAgICBzY29wZS5teXJpYURhdGFzZXQgPSBudWxsO1xuXG4gICAgICAgIHNjb3BlLmxvYWREYXRhc2V0cyA9IGZ1bmN0aW9uKHF1ZXJ5KSB7XG4gICAgICAgICAgcmV0dXJuICRodHRwLmdldChzY29wZS5teXJpYVJlc3RVcmwgKyAnL2RhdGFzZXQvc2VhcmNoLz9xPScgKyBxdWVyeSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgIHNjb3BlLm15cmlhRGF0YXNldHMgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gTG9hZCB0aGUgYXZhaWxhYmxlIGRhdGFzZXRzIGZyb20gTXlyaWFcbiAgICAgICAgc2NvcGUubG9hZERhdGFzZXRzKCcnKTtcblxuICAgICAgICBzY29wZS5vcHRpb25OYW1lID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgICAgIHJldHVybiBkYXRhc2V0LnVzZXJOYW1lICsgJzonICsgZGF0YXNldC5wcm9ncmFtTmFtZSArICc6JyArIGRhdGFzZXQucmVsYXRpb25OYW1lO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmFkZERhdGFzZXQgPSBmdW5jdGlvbihteXJpYURhdGFzZXQpIHtcbiAgICAgICAgICB2YXIgZGF0YXNldCA9IHtcbiAgICAgICAgICAgIGdyb3VwOiAnbXlyaWEnLFxuICAgICAgICAgICAgbmFtZTogbXlyaWFEYXRhc2V0LnJlbGF0aW9uTmFtZSxcbiAgICAgICAgICAgIHVybDogc2NvcGUubXlyaWFSZXN0VXJsICsgJy9kYXRhc2V0L3VzZXItJyArIG15cmlhRGF0YXNldC51c2VyTmFtZSArXG4gICAgICAgICAgICAgICcvcHJvZ3JhbS0nICsgbXlyaWFEYXRhc2V0LnByb2dyYW1OYW1lICtcbiAgICAgICAgICAgICAgJy9yZWxhdGlvbi0nICsgbXlyaWFEYXRhc2V0LnJlbGF0aW9uTmFtZSArICcvZGF0YT9mb3JtYXQ9anNvbidcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgRGF0YXNldC50eXBlID0gJ2pzb24nO1xuICAgICAgICAgIERhdGFzZXQuZGF0YXNldCA9IERhdGFzZXQuYWRkKGRhdGFzZXQpO1xuICAgICAgICAgIERhdGFzZXQudXBkYXRlKERhdGFzZXQuZGF0YXNldCk7XG5cbiAgICAgICAgICBjbG9zZU1vZGFsKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6YWRkVXJsRGF0YXNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGFkZFVybERhdGFzZXRcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdhZGRVcmxEYXRhc2V0JywgZnVuY3Rpb24gKERhdGFzZXQsIExvZ2dlcikge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvYWRkdXJsZGF0YXNldC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnP15ebW9kYWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgLy8gSWYgdGhpcyBkaXJlY3RpdmUgb2NjdXJzIHdpdGhpbiBhIGEgbW9kYWwsIGdpdmUgb3Vyc2VsdmVzIGEgd2F5IHRvIGNsb3NlXG4gICAgICAgIC8vIHRoYXQgbW9kYWwgb25jZSB0aGUgYWRkIGJ1dHRvbiBoYXMgYmVlbiBjbGlja2VkXG4gICAgICAgIGZ1bmN0aW9uIGNsb3NlTW9kYWwoKSB7XG4gICAgICAgICAgaWYgKG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAgICAgbW9kYWxDb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdGhlIGRhdGFzZXQgdG8gYWRkXG4gICAgICAgIHNjb3BlLmFkZGVkRGF0YXNldCA9IHtcbiAgICAgICAgICBncm91cDogJ3VzZXInXG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuYWRkRnJvbVVybCA9IGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuREFUQVNFVF9ORVdfVVJMLCBkYXRhc2V0LnVybCk7XG5cbiAgICAgICAgICAvLyBSZWdpc3RlciB0aGUgbmV3IGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LmRhdGFzZXQgPSBEYXRhc2V0LmFkZChkYXRhc2V0KTtcblxuICAgICAgICAgIC8vIEZldGNoICYgYWN0aXZhdGUgdGhlIG5ld2x5LXJlZ2lzdGVyZWQgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQudXBkYXRlKERhdGFzZXQuZGF0YXNldCk7XG5cbiAgICAgICAgICBjbG9zZU1vZGFsKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGZpbHRlclxuICogQG5hbWUgdmVnYS1saXRlLXVpLmZpbHRlcjppbkdyb3VwXG4gKiBAZnVuY3Rpb25cbiAqIEBkZXNjcmlwdGlvblxuICogIyBpbkdyb3VwXG4gKiBHZXQgZGF0YXNldHMgaW4gYSBwYXJ0aWN1bGFyIGdyb3VwXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGRhdGFzZXRHcm91cCBPbmUgb2YgXCJzYW1wbGUsXCIgXCJ1c2VyXCIsIG9yIFwibXlyaWFcIlxuICogQHJldHVybiB7QXJyYXl9IEFuIGFycmF5IG9mIGRhdGFzZXRzIGluIHRoZSBzcGVjaWZpZWQgZ3JvdXBcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCdpbkdyb3VwJywgZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBmdW5jdGlvbihhcnIsIGRhdGFzZXRHcm91cCkge1xuICAgICAgcmV0dXJuIF8uZmlsdGVyKGFyciwge1xuICAgICAgICBncm91cDogZGF0YXNldEdyb3VwXG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpjaGFuZ2VMb2FkZWREYXRhc2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgY2hhbmdlTG9hZGVkRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2NoYW5nZUxvYWRlZERhdGFzZXQnLCBmdW5jdGlvbiAoRGF0YXNldCwgXykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvY2hhbmdlbG9hZGVkZGF0YXNldC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnP15ebW9kYWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgLy8gSWYgdGhpcyBkaXJlY3RpdmUgb2NjdXJzIHdpdGhpbiBhIGEgbW9kYWwsIGdpdmUgb3Vyc2VsdmVzIGEgd2F5IHRvIGNsb3NlXG4gICAgICAgIC8vIHRoYXQgbW9kYWwgb25jZSB0aGUgYWRkIGJ1dHRvbiBoYXMgYmVlbiBjbGlja2VkXG4gICAgICAgIGZ1bmN0aW9uIGNsb3NlTW9kYWwoKSB7XG4gICAgICAgICAgaWYgKG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAgICAgbW9kYWxDb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXhwb3NlIGRhdGFzZXQgb2JqZWN0IGl0c2VsZiBzbyBjdXJyZW50IGRhdGFzZXQgY2FuIGJlIG1hcmtlZFxuICAgICAgICBzY29wZS5EYXRhc2V0ID0gRGF0YXNldDtcblxuICAgICAgICBzY29wZS51c2VyRGF0YSA9IF8uZmlsdGVyKERhdGFzZXQuZGF0YXNldHMsIGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YXNldC5ncm91cCAhPT0gJ3NhbXBsZSc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLnNhbXBsZURhdGEgPSBfLmZpbHRlcihEYXRhc2V0LmRhdGFzZXRzLCB7XG4gICAgICAgICAgZ3JvdXA6ICdzYW1wbGUnXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBkYXRhc2V0V2F0Y2hlciA9IHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gRGF0YXNldC5kYXRhc2V0cy5sZW5ndGg7XG4gICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLnVzZXJEYXRhID0gXy5maWx0ZXIoRGF0YXNldC5kYXRhc2V0cywgZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGFzZXQuZ3JvdXAgIT09ICdzYW1wbGUnO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS5zZWxlY3REYXRhc2V0ID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgICAgIC8vIEFjdGl2YXRlIHRoZSBzZWxlY3RlZCBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC51cGRhdGUoZGF0YXNldCk7XG4gICAgICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBDbGVhbiB1cCB3YXRjaGVyc1xuICAgICAgICAgIGRhdGFzZXRXYXRjaGVyKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5mYWN0b3J5KCdEYXRhc2V0JywgZnVuY3Rpb24oJGh0dHAsICRxLCBBbGVydHMsIF8sIHV0aWwsIHZsLCBjcWwsIFNhbXBsZURhdGEsIENvbmZpZywgTG9nZ2VyKSB7XG4gICAgdmFyIERhdGFzZXQgPSB7fTtcblxuICAgIC8vIFN0YXJ0IHdpdGggdGhlIGxpc3Qgb2Ygc2FtcGxlIGRhdGFzZXRzXG4gICAgdmFyIGRhdGFzZXRzID0gU2FtcGxlRGF0YTtcblxuICAgIERhdGFzZXQuZGF0YXNldHMgPSBkYXRhc2V0cztcbiAgICBEYXRhc2V0LmRhdGFzZXQgPSBkYXRhc2V0c1sxXTtcbiAgICBEYXRhc2V0LmN1cnJlbnREYXRhc2V0ID0gdW5kZWZpbmVkOyAgLy8gZGF0YXNldCBiZWZvcmUgdXBkYXRlXG4gICAgRGF0YXNldC5kYXRhc2NoZW1hID0gW107XG4gICAgRGF0YXNldC5zdGF0cyA9IHt9O1xuICAgIERhdGFzZXQudHlwZSA9IHVuZGVmaW5lZDtcblxuICAgIHZhciB0eXBlT3JkZXIgPSB7XG4gICAgICBub21pbmFsOiAwLFxuICAgICAgb3JkaW5hbDogMCxcbiAgICAgIGdlb2dyYXBoaWM6IDIsXG4gICAgICB0ZW1wb3JhbDogMyxcbiAgICAgIHF1YW50aXRhdGl2ZTogNFxuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeSA9IHt9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZSA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICBpZiAoZmllbGREZWYuYWdncmVnYXRlPT09J2NvdW50JykgcmV0dXJuIDQ7XG4gICAgICByZXR1cm4gdHlwZU9yZGVyW2ZpZWxkRGVmLnR5cGVdO1xuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlVGhlbk5hbWUgPSBmdW5jdGlvbihmaWVsZERlZikge1xuICAgICAgcmV0dXJuIERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGUoZmllbGREZWYpICsgJ18nICtcbiAgICAgICAgKGZpZWxkRGVmLmFnZ3JlZ2F0ZSA9PT0gJ2NvdW50JyA/ICd+JyA6IGZpZWxkRGVmLmZpZWxkLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICAvLyB+IGlzIHRoZSBsYXN0IGNoYXJhY3RlciBpbiBBU0NJSVxuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS5vcmlnaW5hbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIDA7IC8vIG5vIHN3YXAgd2lsbCBvY2N1clxuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS5maWVsZCA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICByZXR1cm4gZmllbGREZWYuZmllbGQ7XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlciA9IERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGVUaGVuTmFtZTtcblxuICAgIC8vIHVwZGF0ZSB0aGUgc2NoZW1hIGFuZCBzdGF0c1xuICAgIERhdGFzZXQub25VcGRhdGUgPSBbXTtcblxuICAgIERhdGFzZXQudXBkYXRlID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgdmFyIHVwZGF0ZVByb21pc2U7XG5cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5EQVRBU0VUX0NIQU5HRSwgZGF0YXNldC5uYW1lKTtcblxuICAgICAgaWYgKGRhdGFzZXQudmFsdWVzKSB7XG4gICAgICAgIHVwZGF0ZVByb21pc2UgPSAkcShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAvLyBqc2hpbnQgdW51c2VkOmZhbHNlXG4gICAgICAgICAgRGF0YXNldC50eXBlID0gdW5kZWZpbmVkO1xuICAgICAgICAgIHVwZGF0ZUZyb21EYXRhKGRhdGFzZXQsIGRhdGFzZXQudmFsdWVzKTtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdXBkYXRlUHJvbWlzZSA9ICRodHRwLmdldChkYXRhc2V0LnVybCwge2NhY2hlOiB0cnVlfSkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgIHZhciBkYXRhO1xuXG4gICAgICAgICAgLy8gZmlyc3Qgc2VlIHdoZXRoZXIgdGhlIGRhdGEgaXMgSlNPTiwgb3RoZXJ3aXNlIHRyeSB0byBwYXJzZSBDU1ZcbiAgICAgICAgICBpZiAoXy5pc09iamVjdChyZXNwb25zZS5kYXRhKSkge1xuICAgICAgICAgICAgIGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgIERhdGFzZXQudHlwZSA9ICdqc29uJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGF0YSA9IHV0aWwucmVhZChyZXNwb25zZS5kYXRhLCB7dHlwZTogJ2Nzdid9KTtcbiAgICAgICAgICAgIERhdGFzZXQudHlwZSA9ICdjc3YnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHVwZGF0ZUZyb21EYXRhKGRhdGFzZXQsIGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgRGF0YXNldC5vblVwZGF0ZS5mb3JFYWNoKGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gICAgICAgIHVwZGF0ZVByb21pc2UgPSB1cGRhdGVQcm9taXNlLnRoZW4obGlzdGVuZXIpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIENvcHkgdGhlIGRhdGFzZXQgaW50byB0aGUgY29uZmlnIHNlcnZpY2Ugb25jZSBpdCBpcyByZWFkeVxuICAgICAgdXBkYXRlUHJvbWlzZS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBDb25maWcudXBkYXRlRGF0YXNldChkYXRhc2V0LCBEYXRhc2V0LnR5cGUpO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB1cGRhdGVQcm9taXNlO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBnZXRGaWVsZERlZnMoc2NoZW1hLCBvcmRlcikge1xuICAgICAgdmFyIGZpZWxkRGVmcyA9IHNjaGVtYS5maWVsZHMoKS5tYXAoZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBmaWVsZDogZmllbGQsXG4gICAgICAgICAgdHlwZTogc2NoZW1hLnR5cGUoZmllbGQpLFxuICAgICAgICAgIHByaW1pdGl2ZVR5cGU6IHNjaGVtYS5wcmltaXRpdmVUeXBlKGZpZWxkKVxuICAgICAgICB9O1xuICAgICAgfSk7XG5cbiAgICAgIGZpZWxkRGVmcyA9IHV0aWwuc3RhYmxlc29ydChmaWVsZERlZnMsIG9yZGVyIHx8IERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGVUaGVuTmFtZSwgRGF0YXNldC5maWVsZE9yZGVyQnkuZmllbGQpO1xuXG4gICAgICBmaWVsZERlZnMucHVzaCh7IGZpZWxkOiAnKicsIGFnZ3JlZ2F0ZTogdmwuYWdncmVnYXRlLkFnZ3JlZ2F0ZU9wLkNPVU5ULCB0eXBlOiB2bC50eXBlLlFVQU5USVRBVElWRX0pO1xuICAgICAgcmV0dXJuIGZpZWxkRGVmcztcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZUZyb21EYXRhKGRhdGFzZXQsIGRhdGEpIHtcbiAgICAgIERhdGFzZXQuZGF0YSA9IGRhdGE7XG4gICAgICBEYXRhc2V0LmN1cnJlbnREYXRhc2V0ID0gZGF0YXNldDtcblxuICAgICAgRGF0YXNldC5zY2hlbWEgPSBjcWwuc2NoZW1hLlNjaGVtYS5idWlsZChkYXRhKTtcbiAgICAgIC8vIFRPRE86IGZpbmQgYWxsIHJlZmVyZW5jZSBvZiBEYXRhc2V0LnN0YXRzLnNhbXBsZSBhbmQgcmVwbGFjZVxuXG4gICAgICAvLyBUT0RPOiBmaW5kIGFsbCByZWZlcmVuY2Ugb2YgRGF0YXNldC5kYXRhc2NoZW1hIGFuZCByZXBsYWNlXG4gICAgICBEYXRhc2V0LmRhdGFzY2hlbWEgPSBnZXRGaWVsZERlZnMoRGF0YXNldC5zY2hlbWEpO1xuICAgIH1cblxuICAgIERhdGFzZXQuYWRkID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgaWYgKCFkYXRhc2V0LmlkKSB7XG4gICAgICAgIGRhdGFzZXQuaWQgPSBkYXRhc2V0LnVybDtcbiAgICAgIH1cbiAgICAgIGRhdGFzZXRzLnB1c2goZGF0YXNldCk7XG5cbiAgICAgIHJldHVybiBkYXRhc2V0O1xuICAgIH07XG5cbiAgICByZXR1cm4gRGF0YXNldDtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6ZGF0YXNldE1vZGFsXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZGF0YXNldE1vZGFsXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnZGF0YXNldE1vZGFsJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvZGF0YXNldG1vZGFsLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiBmYWxzZVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2RhdGFzZXRTZWxlY3RvcicsIGZ1bmN0aW9uKE1vZGFscywgTG9nZ2VyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9kYXRhc2V0c2VsZWN0b3IuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7fSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUubG9hZERhdGFzZXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuREFUQVNFVF9PUEVOKTtcbiAgICAgICAgICBNb2RhbHMub3BlbignZGF0YXNldC1tb2RhbCcpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmZpbGVEcm9wem9uZVxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGZpbGVEcm9wem9uZVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC8vIEFkZCB0aGUgZmlsZSByZWFkZXIgYXMgYSBuYW1lZCBkZXBlbmRlbmN5XG4gIC5jb25zdGFudCgnRmlsZVJlYWRlcicsIHdpbmRvdy5GaWxlUmVhZGVyKVxuICAuZGlyZWN0aXZlKCdmaWxlRHJvcHpvbmUnLCBmdW5jdGlvbiAoTW9kYWxzLCBBbGVydHMsIEZpbGVSZWFkZXIpIHtcblxuICAgIC8vIEhlbHBlciBtZXRob2RzXG5cbiAgICBmdW5jdGlvbiBpc1NpemVWYWxpZChzaXplLCBtYXhTaXplKSB7XG4gICAgICAvLyBTaXplIGlzIHByb3ZpZGVkIGluIGJ5dGVzOyBtYXhTaXplIGlzIHByb3ZpZGVkIGluIG1lZ2FieXRlc1xuICAgICAgLy8gQ29lcmNlIG1heFNpemUgdG8gYSBudW1iZXIgaW4gY2FzZSBpdCBjb21lcyBpbiBhcyBhIHN0cmluZyxcbiAgICAgIC8vICYgcmV0dXJuIHRydWUgd2hlbiBtYXggZmlsZSBzaXplIHdhcyBub3Qgc3BlY2lmaWVkLCBpcyBlbXB0eSxcbiAgICAgIC8vIG9yIGlzIHN1ZmZpY2llbnRseSBsYXJnZVxuICAgICAgcmV0dXJuICFtYXhTaXplIHx8ICggc2l6ZSAvIDEwMjQgLyAxMDI0IDwgK21heFNpemUgKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1R5cGVWYWxpZCh0eXBlLCB2YWxpZE1pbWVUeXBlcykge1xuICAgICAgICAvLyBJZiBubyBtaW1lIHR5cGUgcmVzdHJpY3Rpb25zIHdlcmUgcHJvdmlkZWQsIG9yIHRoZSBwcm92aWRlZCBmaWxlJ3NcbiAgICAgICAgLy8gdHlwZSBpcyB3aGl0ZWxpc3RlZCwgdHlwZSBpcyB2YWxpZFxuICAgICAgcmV0dXJuICF2YWxpZE1pbWVUeXBlcyB8fCAoIHZhbGlkTWltZVR5cGVzLmluZGV4T2YodHlwZSkgPiAtMSApO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvZmlsZWRyb3B6b25lLmh0bWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAvLyBQZXJtaXQgYXJiaXRyYXJ5IGNoaWxkIGNvbnRlbnRcbiAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBtYXhGaWxlU2l6ZTogJ0AnLFxuICAgICAgICB2YWxpZE1pbWVUeXBlczogJ0AnLFxuICAgICAgICAvLyBFeHBvc2UgdGhpcyBkaXJlY3RpdmUncyBkYXRhc2V0IHByb3BlcnR5IHRvIHBhcmVudCBzY29wZXMgdGhyb3VnaFxuICAgICAgICAvLyB0d28td2F5IGRhdGFiaW5kaW5nXG4gICAgICAgIGRhdGFzZXQ6ICc9J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudC8qLCBhdHRycyovKSB7XG4gICAgICAgIHNjb3BlLmRhdGFzZXQgPSBzY29wZS5kYXRhc2V0IHx8IHt9O1xuXG4gICAgICAgIGVsZW1lbnQub24oJ2RyYWdvdmVyIGRyYWdlbnRlcicsIGZ1bmN0aW9uIG9uRHJhZ0VudGVyKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBldmVudC5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlci5lZmZlY3RBbGxvd2VkID0gJ2NvcHknO1xuICAgICAgICB9KTtcblxuICAgICAgICBmdW5jdGlvbiByZWFkRmlsZShmaWxlKSB7XG4gICAgICAgICAgaWYgKCFpc1R5cGVWYWxpZChmaWxlLnR5cGUsIHNjb3BlLnZhbGlkTWltZVR5cGVzKSkge1xuICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBBbGVydHMuYWRkKCdJbnZhbGlkIGZpbGUgdHlwZS4gRmlsZSBtdXN0IGJlIG9uZSBvZiBmb2xsb3dpbmcgdHlwZXM6ICcgKyBzY29wZS52YWxpZE1pbWVUeXBlcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFpc1NpemVWYWxpZChmaWxlLnNpemUsIHNjb3BlLm1heEZpbGVTaXplKSkge1xuICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBBbGVydHMuYWRkKCdGaWxlIG11c3QgYmUgc21hbGxlciB0aGFuICcgKyBzY29wZS5tYXhGaWxlU2l6ZSArICcgTUInKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIHJldHVybiBzY29wZS4kYXBwbHkoZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgICAgICAgc2NvcGUuZGF0YXNldC5kYXRhID0gZXZ0LnRhcmdldC5yZXN1bHQ7XG4gICAgICAgICAgICAgIC8vIFN0cmlwIGZpbGUgbmFtZSBleHRlbnNpb25zIGZyb20gdGhlIHVwbG9hZGVkIGRhdGFcbiAgICAgICAgICAgICAgc2NvcGUuZGF0YXNldC5uYW1lID0gZmlsZS5uYW1lLnJlcGxhY2UoL1xcLlxcdyskLywgJycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBBbGVydHMuYWRkKCdFcnJvciByZWFkaW5nIGZpbGUnKTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XG4gICAgICAgIH1cblxuICAgICAgICBlbGVtZW50Lm9uKCdkcm9wJywgZnVuY3Rpb24gb25Ecm9wKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlYWRGaWxlKGV2ZW50Lm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyLmZpbGVzWzBdKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZWxlbWVudC5maW5kKCdpbnB1dFt0eXBlPVwiZmlsZVwiXScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiBvblVwbG9hZCgvKmV2ZW50Ki8pIHtcbiAgICAgICAgICAvLyBcInRoaXNcIiBpcyB0aGUgaW5wdXQgZWxlbWVudFxuICAgICAgICAgIHJlYWRGaWxlKHRoaXMuZmlsZXNbMF0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOnBhc3RlRGF0YXNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHBhc3RlRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3Bhc3RlRGF0YXNldCcsIGZ1bmN0aW9uIChEYXRhc2V0LCBMb2dnZXIsIENvbmZpZywgXywgdmcpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L3Bhc3RlZGF0YXNldC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnP15ebW9kYWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgLy8gSWYgdGhpcyBkaXJlY3RpdmUgb2NjdXJzIHdpdGhpbiBhIGEgbW9kYWwsIGdpdmUgb3Vyc2VsdmVzIGEgd2F5IHRvIGNsb3NlXG4gICAgICAgIC8vIHRoYXQgbW9kYWwgb25jZSB0aGUgYWRkIGJ1dHRvbiBoYXMgYmVlbiBjbGlja2VkXG4gICAgICAgIGZ1bmN0aW9uIGNsb3NlTW9kYWwoKSB7XG4gICAgICAgICAgaWYgKG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAgICAgbW9kYWxDb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzY29wZSB2YXJpYWJsZXNcbiAgICAgICAgc2NvcGUuZGF0YXNldCA9IHtcbiAgICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgICBkYXRhOiAnJ1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmFkZERhdGFzZXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9IHZnLnV0aWwucmVhZChzY29wZS5kYXRhc2V0LmRhdGEsIHtcbiAgICAgICAgICAgIHR5cGU6ICdjc3YnXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgcGFzdGVkRGF0YXNldCA9IHtcbiAgICAgICAgICAgIGlkOiBEYXRlLm5vdygpLCAgLy8gdGltZSBhcyBpZFxuICAgICAgICAgICAgbmFtZTogc2NvcGUuZGF0YXNldC5uYW1lLFxuICAgICAgICAgICAgdmFsdWVzOiBkYXRhLFxuICAgICAgICAgICAgZ3JvdXA6ICdwYXN0ZWQnXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIExvZyB0aGF0IHdlIGhhdmUgcGFzdGVkIGRhdGFcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuREFUQVNFVF9ORVdfUEFTVEUsIHBhc3RlZERhdGFzZXQubmFtZSk7XG5cbiAgICAgICAgICAvLyBSZWdpc3RlciB0aGUgcGFzdGVkIGRhdGEgYXMgYSBuZXcgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQuZGF0YXNldCA9IERhdGFzZXQuYWRkKHBhc3RlZERhdGFzZXQpO1xuXG4gICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIG5ld2x5LXJlZ2lzdGVyZWQgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQudXBkYXRlKERhdGFzZXQuZGF0YXNldCk7XG5cbiAgICAgICAgICAvLyBDbG9zZSB0aGlzIGRpcmVjdGl2ZSdzIGNvbnRhaW5pbmcgbW9kYWxcbiAgICAgICAgICBjbG9zZU1vZGFsKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJykuY29uc3RhbnQoJ1NhbXBsZURhdGEnLCBbe1xuICBuYW1lOiAnQmFybGV5JyxcbiAgZGVzY3JpcHRpb246ICdCYXJsZXkgeWllbGQgYnkgdmFyaWV0eSBhY3Jvc3MgdGhlIHVwcGVyIG1pZHdlc3QgaW4gMTkzMSBhbmQgMTkzMicsXG4gIHVybDogJ2RhdGEvYmFybGV5Lmpzb24nLFxuICBpZDogJ2JhcmxleScsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdDYXJzJyxcbiAgZGVzY3JpcHRpb246ICdBdXRvbW90aXZlIHN0YXRpc3RpY3MgZm9yIGEgdmFyaWV0eSBvZiBjYXIgbW9kZWxzIGJldHdlZW4gMTk3MCAmIDE5ODInLFxuICB1cmw6ICdkYXRhL2NhcnMuanNvbicsXG4gIGlkOiAnY2FycycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdDcmltZWEnLFxuICB1cmw6ICdkYXRhL2NyaW1lYS5qc29uJyxcbiAgaWQ6ICdjcmltZWEnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnRHJpdmluZycsXG4gIHVybDogJ2RhdGEvZHJpdmluZy5qc29uJyxcbiAgaWQ6ICdkcml2aW5nJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0lyaXMnLFxuICB1cmw6ICdkYXRhL2lyaXMuanNvbicsXG4gIGlkOiAnaXJpcycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdKb2JzJyxcbiAgdXJsOiAnZGF0YS9qb2JzLmpzb24nLFxuICBpZDogJ2pvYnMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnUG9wdWxhdGlvbicsXG4gIHVybDogJ2RhdGEvcG9wdWxhdGlvbi5qc29uJyxcbiAgaWQ6ICdwb3B1bGF0aW9uJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ01vdmllcycsXG4gIHVybDogJ2RhdGEvbW92aWVzLmpzb24nLFxuICBpZDogJ21vdmllcycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdCaXJkc3RyaWtlcycsXG4gIHVybDogJ2RhdGEvYmlyZHN0cmlrZXMuanNvbicsXG4gIGlkOiAnYmlyZHN0cmlrZXMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQnVydGluJyxcbiAgdXJsOiAnZGF0YS9idXJ0aW4uanNvbicsXG4gIGlkOiAnYnVydGluJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0NhbXBhaWducycsXG4gIHVybDogJ2RhdGEvd2ViYWxsMjYuanNvbicsXG4gIGlkOiAnd2ViYWxsMjYnLFxuICBncm91cDogJ3NhbXBsZSdcbn1dKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdhbGVydE1lc3NhZ2VzJywgZnVuY3Rpb24oQWxlcnRzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9hbGVydG1lc3NhZ2VzL2FsZXJ0bWVzc2FnZXMuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IHt9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUgLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuQWxlcnRzID0gQWxlcnRzO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmJvb2ttYXJrTGlzdFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGJvb2ttYXJrTGlzdFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2Jvb2ttYXJrTGlzdCcsIGZ1bmN0aW9uIChCb29rbWFya3MsIGNvbnN0cykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvYm9va21hcmtsaXN0L2Jvb2ttYXJrbGlzdC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgaGlnaGxpZ2h0ZWQ6ICc9JyAvLyBUaGlzIG9uZSBpcyByZWFsbHkgdHdvLXdheSBiaW5kaW5nLlxuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlIC8qLCBlbGVtZW50LCBhdHRycyovKSB7XG4gICAgICAgIHNjb3BlLkJvb2ttYXJrcyA9IEJvb2ttYXJrcztcbiAgICAgICAgc2NvcGUuY29uc3RzID0gY29uc3RzO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2NoYW5uZWxTaGVsZicsIGZ1bmN0aW9uKEFOWSwgRGF0YXNldCwgUGlsbHMsIF8sIERyb3AsIExvZ2dlciwgdmwsIGNxbCwgU2NoZW1hKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9jaGFubmVsc2hlbGYvY2hhbm5lbHNoZWxmLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBjaGFubmVsSWQ6ICc8JyxcbiAgICAgICAgZW5jb2Rpbmc6ICc9JyxcbiAgICAgICAgbWFyazogJzwnLFxuICAgICAgICBwcmV2aWV3OiAnPCcsXG4gICAgICAgIGRpc2FibGVkOiAnPCdcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCAvKiwgYXR0cnMqLykge1xuICAgICAgICB2YXIgcHJvcHNQb3B1cDtcblxuICAgICAgICAvLyBUT0RPKGh0dHBzOi8vZ2l0aHViLmNvbS92ZWdhL3ZlZ2EtbGl0ZS11aS9pc3N1ZXMvMTg3KTpcbiAgICAgICAgLy8gY29uc2lkZXIgaWYgd2UgY2FuIHVzZSB2YWxpZGF0b3IgLyBjcWwgaW5zdGVhZFxuICAgICAgICBzY29wZS5hbGxvd2VkQ2FzdGluZyA9IHtcbiAgICAgICAgICBxdWFudGl0YXRpdmU6IFt2bC50eXBlLlFVQU5USVRBVElWRSwgdmwudHlwZS5PUkRJTkFMLCB2bC50eXBlLk5PTUlOQUxdLFxuICAgICAgICAgIG9yZGluYWw6IFt2bC50eXBlLk9SRElOQUwsIHZsLnR5cGUuTk9NSU5BTF0sXG4gICAgICAgICAgbm9taW5hbDogW3ZsLnR5cGUuTk9NSU5BTCwgdmwudHlwZS5PUkRJTkFMXSxcbiAgICAgICAgICB0ZW1wb3JhbDogW3ZsLnR5cGUuVEVNUE9SQUwsIHZsLnR5cGUuT1JESU5BTCwgdmwudHlwZS5OT01JTkFMXVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLkRhdGFzZXQgPSBEYXRhc2V0O1xuICAgICAgICBzY29wZS5zY2hlbWEgPSBTY2hlbWEuZ2V0Q2hhbm5lbFNjaGVtYShzY29wZS5jaGFubmVsSWQpO1xuICAgICAgICBzY29wZS5waWxscyA9IFBpbGxzLnBpbGxzO1xuXG4gICAgICAgIHNjb3BlLmlzSGlnaGxpZ2h0ZWQgPSBmdW5jdGlvbiAoY2hhbm5lbElkKSB7XG4gICAgICAgICAgdmFyIGhpZ2hsaWdodGVkID0gUGlsbHMuaGlnaGxpZ2h0ZWQgfHwge307XG4gICAgICAgICAgcmV0dXJuIGhpZ2hsaWdodGVkW3Njb3BlLmVuY29kaW5nW2NoYW5uZWxJZF0uZmllbGRdIHx8XG4gICAgICAgICAgICBoaWdobGlnaHRlZFsnZicgKyBjaGFubmVsSWRdO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRoZXNlIHdpbGwgZ2V0IHVwZGF0ZWQgaW4gdGhlIHdhdGNoZXJcbiAgICAgICAgc2NvcGUuaXNBbnlDaGFubmVsID0gZmFsc2U7XG4gICAgICAgIHNjb3BlLmlzQW55RmllbGQgPSBmYWxzZTtcblxuICAgICAgICBzY29wZS5zdXBwb3J0TWFyayA9IGZ1bmN0aW9uKGNoYW5uZWxJZCwgbWFyaykge1xuICAgICAgICAgIGlmIChQaWxscy5pc0FueUNoYW5uZWwoY2hhbm5lbElkKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChtYXJrID09PSBBTlkpIHsgLy8gVE9ETzogc3VwcG9ydCB7ZW51bTogWy4uLl19XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHZsLmNoYW5uZWwuc3VwcG9ydE1hcmsoY2hhbm5lbElkLCBtYXJrKTtcbiAgICAgICAgfTtcblxuICAgICAgICBwcm9wc1BvcHVwID0gbmV3IERyb3Aoe1xuICAgICAgICAgIGNvbnRlbnQ6IGVsZW1lbnQuZmluZCgnLnNoZWxmLXByb3BlcnRpZXMnKVswXSxcbiAgICAgICAgICB0YXJnZXQ6IGVsZW1lbnQuZmluZCgnLnNoZWxmLWxhYmVsJylbMF0sXG4gICAgICAgICAgcG9zaXRpb246ICdib3R0b20gbGVmdCcsXG4gICAgICAgICAgb3Blbk9uOiAnY2xpY2snXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLmZpZWxkSW5mb1BvcHVwQ29udGVudCA9ICBlbGVtZW50LmZpbmQoJy5zaGVsZi1mdW5jdGlvbnMnKVswXTtcblxuICAgICAgICBzY29wZS5yZW1vdmVGaWVsZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIFBpbGxzLnJlbW92ZShzY29wZS5jaGFubmVsSWQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmZpZWxkRHJhZ1N0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgUGlsbHMuZHJhZ1N0YXJ0KFBpbGxzLmdldChzY29wZS5jaGFubmVsSWQpLCBzY29wZS5jaGFubmVsSWQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmZpZWxkRHJhZ1N0b3AgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBQaWxscy5kcmFnU3RvcCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBoYW5kbGVyIGZvciBkcm9wcGluZyBwaWxsLlxuICAgICAgICAgKi9cbiAgICAgICAgc2NvcGUuZmllbGREcm9wcGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHBpbGwgPSBQaWxscy5nZXQoc2NvcGUuY2hhbm5lbElkKTtcblxuICAgICAgICAgIC8vIHZhbGlkYXRlIHR5cGVcbiAgICAgICAgICB2YXIgdHlwZXMgPSBTY2hlbWEuc2NoZW1hLmRlZmluaXRpb25zLlR5cGUuZW51bTtcbiAgICAgICAgICBpZiAoIV8uaW5jbHVkZXModHlwZXMsIHBpbGwudHlwZSkgJiYgIWNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKHBpbGwudHlwZSkpIHtcbiAgICAgICAgICAgIC8vIGlmIGV4aXN0aW5nIHR5cGUgaXMgbm90IHN1cHBvcnRlZFxuICAgICAgICAgICAgcGlsbC50eXBlID0gdHlwZXNbMF07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVE9ETyB2YWxpZGF0ZSB0aW1lVW5pdCAvIGFnZ3JlZ2F0ZVxuXG4gICAgICAgICAgUGlsbHMuZHJhZ0Ryb3Aoc2NvcGUuY2hhbm5lbElkKTtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuRklFTERfRFJPUCwgcGlsbCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGNoYW5uZWxJZFdhdGNoZXIgPSBzY29wZS4kd2F0Y2goJ2NoYW5uZWxJZCcsIGZ1bmN0aW9uKGNoYW5uZWxJZCkge1xuICAgICAgICAgIHNjb3BlLmlzQW55Q2hhbm5lbCA9IFBpbGxzLmlzQW55Q2hhbm5lbChjaGFubmVsSWQpO1xuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAvLyBGSVhNRTogcmVtb3ZlIHRoaXMgY29uZnVzaW5nIDItd2F5IGJpbmRpbmcgbG9naWNzXG4gICAgICAgIC8vIElmIHNvbWUgZXh0ZXJuYWwgYWN0aW9uIGNoYW5nZXMgdGhlIGZpZWxkRGVmLCB3ZSBhbHNvIG5lZWQgdG8gdXBkYXRlIHRoZSBwaWxsXG4gICAgICAgIHZhciBjaGFubmVsRW5jb2RpbmdXYXRjaGVyID0gc2NvcGUuJHdhdGNoKCdlbmNvZGluZ1tjaGFubmVsSWRdJywgZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgICAgICAvLyBQcmV2aWV3IHNoZWxmIHNob3VsZCBub3QgY2F1c2Ugc2lkZSBlZmZlY3RcbiAgICAgICAgICBpZiAoc2NvcGUucHJldmlldykge1xuICAgICAgICAgICAgc2NvcGUuaXNFbnVtZXJhdGVkRmllbGQgPSBQaWxscy5pc0VudW1lcmF0ZWRGaWVsZChzY29wZS5jaGFubmVsSWQpO1xuICAgICAgICAgICAgc2NvcGUuaXNFbnVtZXJhdGVkQ2hhbm5lbCA9IFBpbGxzLmlzRW51bWVyYXRlZENoYW5uZWwoc2NvcGUuY2hhbm5lbElkKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgUGlsbHMuc2V0KHNjb3BlLmNoYW5uZWxJZCwgZmllbGREZWYgPyBfLmNsb25lRGVlcChmaWVsZERlZikgOiB7fSk7XG4gICAgICAgICAgICBzY29wZS5pc0FueUZpZWxkID0gY3FsLmVudW1TcGVjLmlzRW51bVNwZWMoZmllbGREZWYuZmllbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgc2NvcGUuJHdhdGNoR3JvdXAoWydhbGxvd2VkQ2FzdGluZ1tEYXRhc2V0LnNjaGVtYS50eXBlKGVuY29kaW5nW2NoYW5uZWxJZF0uZmllbGQpXScsICdlbmNvZGluZ1tjaGFubmVsXS5hZ2dyZWdhdGUnXSwgZnVuY3Rpb24oYXJyKXtcbiAgICAgICAgICB2YXIgYWxsb3dlZFR5cGVzID0gYXJyWzBdLCBhZ2dyZWdhdGU9YXJyWzFdO1xuICAgICAgICAgIHNjb3BlLmFsbG93ZWRUeXBlcyA9IGFnZ3JlZ2F0ZSA9PT0gJ2NvdW50JyA/IFt2bC50eXBlLlFVQU5USVRBVElWRV0gOiBhbGxvd2VkVHlwZXM7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAocHJvcHNQb3B1cCAmJiBwcm9wc1BvcHVwLmRlc3Ryb3kpIHtcbiAgICAgICAgICAgIHByb3BzUG9wdXAuZGVzdHJveSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIENsZWFuIHVwIHdhdGNoZXJzXG4gICAgICAgICAgY2hhbm5lbElkV2F0Y2hlcigpO1xuICAgICAgICAgIGNoYW5uZWxFbmNvZGluZ1dhdGNoZXIoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6ZmllbGRJbmZvXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZmllbGRJbmZvXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnZmllbGRJbmZvJywgZnVuY3Rpb24gKEFOWSwgRHJvcCwgdmwsIGNxbCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvZmllbGRpbmZvL2ZpZWxkaW5mby5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgZmllbGREZWY6ICc8JyxcbiAgICAgICAgc2hvd0FkZDogJzwnLFxuICAgICAgICBzaG93Q2FyZXQ6ICc8JyxcbiAgICAgICAgc2hvd1JlbW92ZTogJzwnLFxuICAgICAgICBzaG93VHlwZTogJzwnLFxuICAgICAgICBwb3B1cENvbnRlbnQ6ICc8JyxcblxuICAgICAgICBhY3Rpb246ICcmJyxcbiAgICAgICAgYWRkQWN0aW9uOiAnJicsXG4gICAgICAgIHJlbW92ZUFjdGlvbjogJyYnLFxuICAgICAgICBkaXNhYmxlQ291bnRDYXJldDogJzwnLFxuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgIHZhciBmdW5jc1BvcHVwO1xuICAgICAgICBzY29wZS52bFR5cGUgPSB2bC50eXBlO1xuICAgICAgICBzY29wZS5pc0VudW1TcGVjID0gY3FsLmVudW1TcGVjLmlzRW51bVNwZWM7XG5cbiAgICAgICAgLy8gUHJvcGVydGllcyB0aGF0IGFyZSBjcmVhdGVkIGJ5IGEgd2F0Y2hlciBsYXRlclxuICAgICAgICBzY29wZS50eXBlTmFtZSA9IG51bGw7XG4gICAgICAgIHNjb3BlLmljb24gPSBudWxsO1xuICAgICAgICBzY29wZS5udWxsID0gbnVsbDtcblxuICAgICAgICBzY29wZS5jbGlja2VkID0gZnVuY3Rpb24oJGV2ZW50KXtcbiAgICAgICAgICBpZihzY29wZS5hY3Rpb24gJiYgJGV2ZW50LnRhcmdldCAhPT0gZWxlbWVudC5maW5kKCcuZmEtY2FyZXQtZG93bicpWzBdICYmXG4gICAgICAgICAgICAkZXZlbnQudGFyZ2V0ICE9PSBlbGVtZW50LmZpbmQoJ3NwYW4udHlwZScpWzBdKSB7XG4gICAgICAgICAgICBzY29wZS5hY3Rpb24oJGV2ZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuZnVuYyA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICAgICAgcmV0dXJuIGZpZWxkRGVmLmFnZ3JlZ2F0ZSB8fCBmaWVsZERlZi50aW1lVW5pdCB8fFxuICAgICAgICAgICAgKGZpZWxkRGVmLmJpbiAmJiAnYmluJykgfHxcbiAgICAgICAgICAgIGZpZWxkRGVmLl9hZ2dyZWdhdGUgfHwgZmllbGREZWYuX3RpbWVVbml0IHx8XG4gICAgICAgICAgICAoZmllbGREZWYuX2JpbiAmJiAnYmluJykgfHwgKGZpZWxkRGVmLl9hbnkgJiYgJ2F1dG8nKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgcG9wdXBDb250ZW50V2F0Y2hlciA9IHNjb3BlLiR3YXRjaCgncG9wdXBDb250ZW50JywgZnVuY3Rpb24ocG9wdXBDb250ZW50KSB7XG4gICAgICAgICAgaWYgKCFwb3B1cENvbnRlbnQpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICBpZiAoZnVuY3NQb3B1cCkge1xuICAgICAgICAgICAgZnVuY3NQb3B1cC5kZXN0cm95KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZnVuY3NQb3B1cCA9IG5ldyBEcm9wKHtcbiAgICAgICAgICAgIGNvbnRlbnQ6IHBvcHVwQ29udGVudCxcbiAgICAgICAgICAgIHRhcmdldDogZWxlbWVudC5maW5kKCcudHlwZS1jYXJldCcpWzBdLFxuICAgICAgICAgICAgcG9zaXRpb246ICdib3R0b20gbGVmdCcsXG4gICAgICAgICAgICBvcGVuT246ICdjbGljaydcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIFRZUEVfTkFNRVMgPSB7XG4gICAgICAgICAgbm9taW5hbDogJ3RleHQnLFxuICAgICAgICAgIG9yZGluYWw6ICd0ZXh0LW9yZGluYWwnLFxuICAgICAgICAgIHF1YW50aXRhdGl2ZTogJ251bWJlcicsXG4gICAgICAgICAgdGVtcG9yYWw6ICd0aW1lJyxcbiAgICAgICAgICBnZW9ncmFwaGljOiAnZ2VvJ1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBUWVBFX0lDT05TID0ge1xuICAgICAgICAgIG5vbWluYWw6ICdmYS1mb250JyxcbiAgICAgICAgICBvcmRpbmFsOiAnZmEtZm9udCcsXG4gICAgICAgICAgcXVhbnRpdGF0aXZlOiAnaWNvbi1oYXNoJyxcbiAgICAgICAgICB0ZW1wb3JhbDogJ2ZhLWNhbGVuZGFyJyxcbiAgICAgICAgfTtcbiAgICAgICAgVFlQRV9JQ09OU1tBTlldID0gJ2ZhLWFzdGVyaXNrJzsgLy8gc2VwYXJhdGUgbGluZSBiZWNhdXNlIHdlIG1pZ2h0IGNoYW5nZSB3aGF0J3MgdGhlIHN0cmluZyBmb3IgQU5ZXG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0VHlwZURpY3RWYWx1ZSh0eXBlLCBkaWN0KSB7XG4gICAgICAgICAgaWYgKGNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKHR5cGUpKSB7IC8vIGlzIGVudW1TcGVjXG4gICAgICAgICAgICB2YXIgdmFsID0gbnVsbDtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdHlwZS5lbnVtLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgIHZhciBfdHlwZSA9IHR5cGUuZW51bVtpXTtcbiAgICAgICAgICAgICAgaWYgKHZhbCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHZhbCA9IGRpY3RbX3R5cGVdO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh2YWwgIT09IGRpY3RbX3R5cGVdKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gQU5ZOyAvLyBJZiB0aGVyZSBhcmUgbWFueSBjb25mbGljdGluZyB0eXBlc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHZhbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGRpY3RbdHlwZV07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZmllbGREZWZXYXRjaGVyID0gc2NvcGUuJHdhdGNoKCdmaWVsZERlZicsIGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICAgICAgc2NvcGUuaWNvbiA9IGdldFR5cGVEaWN0VmFsdWUoZmllbGREZWYudHlwZSwgVFlQRV9JQ09OUyk7XG4gICAgICAgICAgc2NvcGUudHlwZU5hbWUgPSBnZXRUeXBlRGljdFZhbHVlKGZpZWxkRGVmLnR5cGUsIFRZUEVfTkFNRVMpO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKGZ1bmNzUG9wdXAgJiYgZnVuY3NQb3B1cC5kZXN0cm95KSB7XG4gICAgICAgICAgICBmdW5jc1BvcHVwLmRlc3Ryb3koKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyB1bnJlZ2lzdGVyIHdhdGNoZXJzXG4gICAgICAgICAgcG9wdXBDb250ZW50V2F0Y2hlcigpO1xuICAgICAgICAgIGZpZWxkRGVmV2F0Y2hlcigpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdmdW5jdGlvblNlbGVjdCcsIGZ1bmN0aW9uKF8sIGNvbnN0cywgdmwsIFBpbGxzLCBMb2dnZXIsIERhdGFzZXQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2Z1bmN0aW9uc2VsZWN0L2Z1bmN0aW9uc2VsZWN0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGNoYW5uZWxJZDogJzwnLFxuICAgICAgICBmaWVsZERlZjogJz0nXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUgLyosZWxlbWVudCwgYXR0cnMqLykge1xuICAgICAgICB2YXIgQklOPSdiaW4nLCBDT1VOVD0nY291bnQnLCBtYXhiaW5zO1xuXG4gICAgICAgIHNjb3BlLmZ1bmMgPSB7XG4gICAgICAgICAgc2VsZWN0ZWQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICBsaXN0OiB7XG4gICAgICAgICAgICBhYm92ZUZvbGQ6IFtdLFxuICAgICAgICAgICAgYmVsb3dGb2xkOiBbXSAvLyBjb3VsZCBiZSBlbXB0eVxuICAgICAgICAgIH0sXG4gICAgICAgICAgaXNUZW1wb3JhbDogZmFsc2UsIC8vIGZvciBtYWtpbmcgYmVsb3dGb2xkIHRpbWVVbml0cyBzaW5nbGUtY29sdW1uXG4gICAgICAgICAgaXNDb3VudDogZmFsc2UgLy8gaGlkZSBcIm1vcmVcIiAmIFwibGVzc1wiIHRvZ2dsZSBmb3IgQ09VTlRcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBmdW5jdGlvbnMgZm9yIFQgPSB0aW1lVW5pdHMgKyB1bmRlZmluZWRcbiAgICAgICAgdmFyIHRlbXBvcmFsRnVuY3Rpb25zID0ge1xuICAgICAgICAgIGFib3ZlRm9sZDogW1xuICAgICAgICAgICAgdW5kZWZpbmVkLCAneWVhcicsXG4gICAgICAgICAgICAncXVhcnRlcicsICdtb250aCcsXG4gICAgICAgICAgICAnZGF0ZScsJ2RheScsXG4gICAgICAgICAgICAnaG91cnMnLCAnbWludXRlcycsXG4gICAgICAgICAgICAnc2Vjb25kcycsICdtaWxsaXNlY29uZHMnLFxuICAgICAgICAgICAgJ3llYXJtb250aGRhdGUnXG4gICAgICAgICAgXSxcbiAgICAgICAgICBiZWxvd0ZvbGQ6IFtcbiAgICAgICAgICAgICd5ZWFycXVhcnRlcicsXG4gICAgICAgICAgICAneWVhcm1vbnRoJyxcbiAgICAgICAgICAgICd5ZWFybW9udGhkYXRlaG91cnMnLFxuICAgICAgICAgICAgJ3llYXJtb250aGRhdGVob3Vyc21pbnV0ZXMnLFxuICAgICAgICAgICAgJ3llYXJtb250aGRhdGVob3Vyc21pbnV0ZXNzZWNvbmRzJyxcbiAgICAgICAgICAgICdob3Vyc21pbnV0ZXMnLFxuICAgICAgICAgICAgJ2hvdXJzbWludXRlc3NlY29uZHMnLFxuICAgICAgICAgICAgJ21pbnV0ZXNzZWNvbmRzJyxcbiAgICAgICAgICAgICdzZWNvbmRzbWlsbGlzZWNvbmRzJ1xuICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgY2FyZGluYWxpdHlGaWx0ZXIgPSBmdW5jdGlvbih0aW1lVW5pdCkge1xuXG4gICAgICAgICAgdmFyIHBpbGwgPSAgUGlsbHMuZ2V0KHNjb3BlLmNoYW5uZWxJZCk7XG4gICAgICAgICAgaWYgKCFwaWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGZpZWxkID0gcGlsbC5maWVsZDtcbiAgICAgICAgICAvLyBDb252ZXJ0ICdhbnknIGNoYW5uZWwgdG8gJz8nLlxuICAgICAgICAgIHZhciBjaGFubmVsID0gUGlsbHMuaXNBbnlDaGFubmVsKHNjb3BlLmNoYW5uZWxJZCkgPyAnPycgOiBzY29wZS5jaGFubmVsSWQ7XG4gICAgICAgICAgcmV0dXJuICF0aW1lVW5pdCB8fCAvLyBEb24ndCBmaWx0ZXIgdW5kZWZpbmVkLlxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRpbWVVbml0cyB0aGF0IGRvIG5vdCBoYXZlIHZhcmlhdGlvbiAoY2FyZGluYWxpdHkgPD0gMSkuXG4gICAgICAgICAgICBEYXRhc2V0LnNjaGVtYS50aW1lVW5pdEhhc1ZhcmlhdGlvbih7ZmllbGQ6IGZpZWxkLCBjaGFubmVsOiBjaGFubmVsLCB0aW1lVW5pdDogdGltZVVuaXR9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyB0aW1lVW5pdHMgPSBUIGZ1bmN0aW9ucyAtIHVuZGVmaW5lZFxuICAgICAgICB2YXIgdGltZVVuaXRzID0gXy5wdWxsKF8uY29uY2F0KHRlbXBvcmFsRnVuY3Rpb25zLmFib3ZlRm9sZCwgdGVtcG9yYWxGdW5jdGlvbnMuYmVsb3dGb2xkKSwgdW5kZWZpbmVkKTtcblxuICAgICAgICAvLyBmdW5jdGlvbnMgZm9yIFEgPSBhZ2dyZWdhdGVzICsgQklOICsgdW5kZWZpbmVkIC0gQ09VTlRcbiAgICAgICAgdmFyIHF1YW50aXRhdGl2ZUZ1bmN0aW9ucyA9IHtcbiAgICAgICAgICBhYm92ZUZvbGQ6IFtcbiAgICAgICAgICAgIHVuZGVmaW5lZCwgJ2JpbicsXG4gICAgICAgICAgICAnbWluJywgJ21heCcsXG4gICAgICAgICAgICAnbWVhbicsICdtZWRpYW4nLFxuICAgICAgICAgICAgJ3N1bSdcbiAgICAgICAgICBdLFxuICAgICAgICAgIGJlbG93Rm9sZDogW1xuICAgICAgICAgICAgJ3ZhbGlkJywgJ21pc3NpbmcnLFxuICAgICAgICAgICAgJ2Rpc3RpbmN0JywgJ21vZGVza2V3JyxcbiAgICAgICAgICAgICdxMScsICdxMycsXG4gICAgICAgICAgICAnc3RkZXYnLCAnc3RkZXZwJyxcbiAgICAgICAgICAgICd2YXJpYW5jZScsICd2YXJpYW5jZXAnXG4gICAgICAgICAgXSAvLyBoaWRlIENPVU5UIGZvciBRIGluIHRoZSBVSSBiZWNhdXNlIHdlIGRlZGljYXRlIGl0IHRvIGEgc3BlY2lhbCBcIiMgQ291bnRcIiBmaWVsZFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGFnZ3JlZ2F0ZXMgPSBRIEZ1bmN0aW9ucyArIENPVU5UIC0gQklOIC0gdW5kZWZpbmVkXG4gICAgICAgIHZhciBhZ2dyZWdhdGVzID0gXy5wdWxsKF8uY29uY2F0KHF1YW50aXRhdGl2ZUZ1bmN0aW9ucy5hYm92ZUZvbGQsIHF1YW50aXRhdGl2ZUZ1bmN0aW9ucy5iZWxvd0ZvbGQsIFtDT1VOVF0pLFxuICAgICAgICAgIEJJTiwgdW5kZWZpbmVkKTtcblxuICAgICAgICBzY29wZS5zZWxlY3RDaGFuZ2VkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkZVTkNfQ0hBTkdFLCBzY29wZS5mdW5jLnNlbGVjdGVkKTtcblxuICAgICAgICAgIHZhciBzZWxlY3RlZEZ1bmMgPSBzY29wZS5mdW5jLnNlbGVjdGVkO1xuXG4gICAgICAgICAgdmFyIG9sZFBpbGwgPSBQaWxscy5nZXQoc2NvcGUuY2hhbm5lbElkKSxcbiAgICAgICAgICAgIHBpbGwgPSBfLmNsb25lKG9sZFBpbGwpLFxuICAgICAgICAgICAgdHlwZSA9IHBpbGwgPyBwaWxsLnR5cGUgOiAnJyxcbiAgICAgICAgICAgIGlzUSA9IHR5cGUgPT09IHZsLnR5cGUuUVVBTlRJVEFUSVZFLFxuICAgICAgICAgICAgaXNUID0gdHlwZSA9PT0gdmwudHlwZS5URU1QT1JBTDtcblxuICAgICAgICAgIGlmKCFwaWxsKXtcbiAgICAgICAgICAgIHJldHVybjsgLy8gbm90IHJlYWR5XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gcmVzZXQgZmllbGQgZGVmXG4gICAgICAgICAgLy8gSEFDSzogd2UncmUgdGVtcG9yYXJpbHkgc3RvcmluZyB0aGUgbWF4YmlucyBpbiB0aGUgcGlsbFxuICAgICAgICAgIHBpbGwuYmluID0gc2VsZWN0ZWRGdW5jID09PSBCSU4gPyB7fSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICBwaWxsLmFnZ3JlZ2F0ZSA9IChpc1EgJiYgYWdncmVnYXRlcy5pbmRleE9mKHNlbGVjdGVkRnVuYykgIT09IC0xKSA/IHNlbGVjdGVkRnVuYyA6IHVuZGVmaW5lZDtcbiAgICAgICAgICBwaWxsLnRpbWVVbml0ID0gKGlzVCAmJiB0aW1lVW5pdHMuaW5kZXhPZihzZWxlY3RlZEZ1bmMpICE9PSAtMSkgPyBzZWxlY3RlZEZ1bmMgOiB1bmRlZmluZWQ7XG5cbiAgICAgICAgICBpZighXy5pc0VxdWFsKG9sZFBpbGwsIHBpbGwpKXtcbiAgICAgICAgICAgIFBpbGxzLnNldChzY29wZS5jaGFubmVsSWQsIHBpbGwsIHRydWUgLyogcHJvcGFnYXRlIGNoYW5nZSAqLyk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHdoZW4gcGFyZW50IG9iamVjdHMgbW9kaWZ5IHRoZSBmaWVsZFxuICAgICAgICB2YXIgZmllbGREZWZXYXRjaGVyID0gc2NvcGUuJHdhdGNoKCdmaWVsZERlZicsIGZ1bmN0aW9uKHBpbGwpIHtcbiAgICAgICAgICBpZiAoIXBpbGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgdHlwZSA9IHBpbGwuZmllbGQgPyBwaWxsLnR5cGUgOiAnJztcblxuICAgICAgICAgIC8vIGhhY2s6IHNhdmUgdGhlIG1heGJpbnNcbiAgICAgICAgICBpZiAocGlsbC5iaW4pIHtcbiAgICAgICAgICAgIG1heGJpbnMgPSBwaWxsLmJpbi5tYXhiaW5zO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBpc09yZGluYWxTaGVsZiA9IFsncm93JywnY29sdW1uJywnc2hhcGUnXS5pbmRleE9mKHNjb3BlLmNoYW5uZWxJZCkgIT09IC0xLFxuICAgICAgICAgICAgaXNRID0gdHlwZSA9PT0gdmwudHlwZS5RVUFOVElUQVRJVkUsXG4gICAgICAgICAgICBpc1QgPSB0eXBlID09PSB2bC50eXBlLlRFTVBPUkFMO1xuXG4gICAgICAgICAgLy8gZm9yIG1ha2luZyBiZWxvd0ZvbGQgdGltZVVuaXRzIHNpbmdsZS1jb2x1bW5cbiAgICAgICAgICBzY29wZS5mdW5jLmlzVGVtcG9yYWwgPSBpc1Q7XG5cbiAgICAgICAgICAvLyBoaWRlIFwibW9yZVwiICYgXCJsZXNzXCIgdG9nZ2xlcyBmb3IgQ09VTlRcbiAgICAgICAgICBzY29wZS5mdW5jLmlzQ291bnQgPSBwaWxsLmZpZWxkID09PSAnKic7XG5cbiAgICAgICAgICBpZihwaWxsLmZpZWxkID09PSAnKicgJiYgcGlsbC5hZ2dyZWdhdGUgPT09IENPVU5UKXtcbiAgICAgICAgICAgIHNjb3BlLmZ1bmMubGlzdC5hYm92ZUZvbGQ9W0NPVU5UXTtcbiAgICAgICAgICAgIHNjb3BlLmZ1bmMubGlzdC5iZWxvd0ZvbGQ9W107XG4gICAgICAgICAgICBzY29wZS5mdW5jLnNlbGVjdGVkID0gQ09VTlQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIHN1cHBvcnRlZCB0eXBlIGJhc2VkIG9uIHByaW1pdGl2ZSBkYXRhP1xuICAgICAgICAgICAgaWYgKGlzVCkge1xuICAgICAgICAgICAgICBzY29wZS5mdW5jLmxpc3QuYWJvdmVGb2xkID0gdGVtcG9yYWxGdW5jdGlvbnMuYWJvdmVGb2xkLmZpbHRlcihjYXJkaW5hbGl0eUZpbHRlcik7XG4gICAgICAgICAgICAgIHNjb3BlLmZ1bmMubGlzdC5iZWxvd0ZvbGQgPSB0ZW1wb3JhbEZ1bmN0aW9ucy5iZWxvd0ZvbGQuZmlsdGVyKGNhcmRpbmFsaXR5RmlsdGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGlzUSkge1xuICAgICAgICAgICAgICBzY29wZS5mdW5jLmxpc3QuYWJvdmVGb2xkID0gcXVhbnRpdGF0aXZlRnVuY3Rpb25zLmFib3ZlRm9sZDtcbiAgICAgICAgICAgICAgc2NvcGUuZnVuYy5saXN0LmJlbG93Rm9sZCA9IHF1YW50aXRhdGl2ZUZ1bmN0aW9ucy5iZWxvd0ZvbGQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBkZWZhdWx0VmFsID0gKGlzT3JkaW5hbFNoZWxmICYmXG4gICAgICAgICAgICAgIChpc1EgJiYgQklOKSB8fCAoaXNUICYmIGNvbnN0cy5kZWZhdWx0VGltZUZuKVxuICAgICAgICAgICAgKSB8fCB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgIHZhciBzZWxlY3RlZCA9IHBpbGwuYmluID8gJ2JpbicgOlxuICAgICAgICAgICAgICBwaWxsLmFnZ3JlZ2F0ZSB8fCBwaWxsLnRpbWVVbml0O1xuXG4gICAgICAgICAgICBpZiAoc2NvcGUuZnVuYy5saXN0LmFib3ZlRm9sZC5pbmRleE9mKHNlbGVjdGVkKSA+PSAwIHx8IHNjb3BlLmZ1bmMubGlzdC5iZWxvd0ZvbGQuaW5kZXhPZihzZWxlY3RlZCkgPj0gMCkge1xuICAgICAgICAgICAgICBzY29wZS5mdW5jLnNlbGVjdGVkID0gc2VsZWN0ZWQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzY29wZS5mdW5jLnNlbGVjdGVkID0gZGVmYXVsdFZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBDbGVhbiB1cCB3YXRjaGVyKHMpXG4gICAgICAgICAgZmllbGREZWZXYXRjaGVyKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOm1vZGFsXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgbW9kYWxcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdtb2RhbCcsIGZ1bmN0aW9uICgkZG9jdW1lbnQsIE1vZGFscykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvbW9kYWwvbW9kYWwuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGF1dG9PcGVuOiAnPCcsXG4gICAgICAgIG1heFdpZHRoOiAnQCdcbiAgICAgIH0sXG4gICAgICAvLyBQcm92aWRlIGFuIGludGVyZmFjZSBmb3IgY2hpbGQgZGlyZWN0aXZlcyB0byBjbG9zZSB0aGlzIG1vZGFsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgICAgdGhpcy5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRzY29wZS5pc09wZW4gPSBmYWxzZTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgdmFyIG1vZGFsSWQgPSBhdHRycy5pZDtcblxuICAgICAgICBpZiAoc2NvcGUubWF4V2lkdGgpIHtcbiAgICAgICAgICBzY29wZS53cmFwcGVyU3R5bGUgPSAnbWF4LXdpZHRoOicgKyBzY29wZS5tYXhXaWR0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlZmF1bHQgdG8gY2xvc2VkIHVubGVzcyBhdXRvT3BlbiBpcyBzZXRcbiAgICAgICAgc2NvcGUuaXNPcGVuID0gc2NvcGUuYXV0b09wZW47XG5cbiAgICAgICAgLy8gY2xvc2Ugb24gZXNjXG4gICAgICAgIGZ1bmN0aW9uIGVzY2FwZShlKSB7XG4gICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMjcgJiYgc2NvcGUuaXNPcGVuKSB7XG4gICAgICAgICAgICBzY29wZS5pc09wZW4gPSBmYWxzZTtcbiAgICAgICAgICAgIHNjb3BlLiRkaWdlc3QoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBhbmd1bGFyLmVsZW1lbnQoJGRvY3VtZW50KS5vbigna2V5ZG93bicsIGVzY2FwZSk7XG5cbiAgICAgICAgLy8gUmVnaXN0ZXIgdGhpcyBtb2RhbCB3aXRoIHRoZSBzZXJ2aWNlXG4gICAgICAgIE1vZGFscy5yZWdpc3Rlcihtb2RhbElkLCBzY29wZSk7XG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBNb2RhbHMuZGVyZWdpc3Rlcihtb2RhbElkKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6bW9kYWxDbG9zZUJ1dHRvblxuICogQGRlc2NyaXB0aW9uXG4gKiAjIG1vZGFsQ2xvc2VCdXR0b25cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdtb2RhbENsb3NlQnV0dG9uJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9tb2RhbC9tb2RhbGNsb3NlYnV0dG9uLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICdeXm1vZGFsJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGNsb3NlQWN0aW9uOiAnJidcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICBzY29wZS5jbG9zZU1vZGFsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbW9kYWxDb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgaWYgKHNjb3BlLmNsb3NlQWN0aW9uKSB7XG4gICAgICAgICAgICBzY29wZS5jbG9zZUFjdGlvbigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2Mgc2VydmljZVxuICogQG5hbWUgdmx1aS5Nb2RhbHNcbiAqIEBkZXNjcmlwdGlvblxuICogIyBNb2RhbHNcbiAqIFNlcnZpY2UgdXNlZCB0byBjb250cm9sIG1vZGFsIHZpc2liaWxpdHkgZnJvbSBhbnl3aGVyZSBpbiB0aGUgYXBwbGljYXRpb25cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmFjdG9yeSgnTW9kYWxzJywgZnVuY3Rpb24gKCRjYWNoZUZhY3RvcnkpIHtcblxuICAgIC8vIFRPRE86IFRoZSB1c2Ugb2Ygc2NvcGUgaGVyZSBhcyB0aGUgbWV0aG9kIGJ5IHdoaWNoIGEgbW9kYWwgZGlyZWN0aXZlXG4gICAgLy8gaXMgcmVnaXN0ZXJlZCBhbmQgY29udHJvbGxlZCBtYXkgbmVlZCB0byBjaGFuZ2UgdG8gc3VwcG9ydCByZXRyaWV2aW5nXG4gICAgLy8gZGF0YSBmcm9tIGEgbW9kYWwgYXMgbWF5IGJlIG5lZWRlZCBpbiAjNzdcbiAgICB2YXIgbW9kYWxzQ2FjaGUgPSAkY2FjaGVGYWN0b3J5KCdtb2RhbHMnKTtcblxuICAgIC8vIFB1YmxpYyBBUElcbiAgICByZXR1cm4ge1xuICAgICAgcmVnaXN0ZXI6IGZ1bmN0aW9uKGlkLCBzY29wZSkge1xuICAgICAgICBpZiAobW9kYWxzQ2FjaGUuZ2V0KGlkKSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Nhbm5vdCByZWdpc3RlciB0d28gbW9kYWxzIHdpdGggaWQgJyArIGlkKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbW9kYWxzQ2FjaGUucHV0KGlkLCBzY29wZSk7XG4gICAgICB9LFxuXG4gICAgICBkZXJlZ2lzdGVyOiBmdW5jdGlvbihpZCkge1xuICAgICAgICBtb2RhbHNDYWNoZS5yZW1vdmUoaWQpO1xuICAgICAgfSxcblxuICAgICAgLy8gT3BlbiBhIG1vZGFsXG4gICAgICBvcGVuOiBmdW5jdGlvbihpZCkge1xuICAgICAgICB2YXIgbW9kYWxTY29wZSA9IG1vZGFsc0NhY2hlLmdldChpZCk7XG4gICAgICAgIGlmICghbW9kYWxTY29wZSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1VucmVnaXN0ZXJlZCBtb2RhbCBpZCAnICsgaWQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBtb2RhbFNjb3BlLmlzT3BlbiA9IHRydWU7XG4gICAgICB9LFxuXG4gICAgICAvLyBDbG9zZSBhIG1vZGFsXG4gICAgICBjbG9zZTogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgdmFyIG1vZGFsU2NvcGUgPSBtb2RhbHNDYWNoZS5nZXQoaWQpO1xuICAgICAgICBpZiAoIW1vZGFsU2NvcGUpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbnJlZ2lzdGVyZWQgbW9kYWwgaWQgJyArIGlkKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbW9kYWxTY29wZS5pc09wZW4gPSBmYWxzZTtcbiAgICAgIH0sXG5cbiAgICAgIGVtcHR5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgbW9kYWxzQ2FjaGUucmVtb3ZlQWxsKCk7XG4gICAgICB9LFxuXG4gICAgICBjb3VudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBtb2RhbHNDYWNoZS5pbmZvKCkuc2l6ZTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZGlyZWN0aXZlOnByb3BlcnR5RWRpdG9yXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgcHJvcGVydHlFZGl0b3JcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdwcm9wZXJ0eUVkaXRvcicsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3Byb3BlcnR5ZWRpdG9yL3Byb3BlcnR5ZWRpdG9yLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGlkOiAnPScsXG4gICAgICAgIHR5cGU6ICc9JyxcbiAgICAgICAgZW51bTogJz0nLFxuICAgICAgICBwcm9wTmFtZTogJz0nLFxuICAgICAgICBncm91cDogJz0nLFxuICAgICAgICBkZXNjcmlwdGlvbjogJz0nLFxuICAgICAgICBkZWZhdWx0OiAnPScsXG4gICAgICAgIG1pbjogJz0nLFxuICAgICAgICBtYXg6ICc9JyxcbiAgICAgICAgcm9sZTogJz0nIC8vIGZvciBleGFtcGxlICdjb2xvcidcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSAvKiwgZWxlbWVudCwgYXR0cnMqLykge1xuICAgICAgICBzY29wZS5oYXNBdXRvID0gc2NvcGUuZGVmYXVsdCA9PT0gdW5kZWZpbmVkO1xuXG4gICAgICAgIC8vVE9ETyhrYW5pdHcpOiBjb25zaWRlciByZW5hbWluZ1xuICAgICAgICBzY29wZS5hdXRvbW9kZWwgPSB7IHZhbHVlOiBmYWxzZSB9O1xuXG4gICAgICAgIGlmIChzY29wZS5oYXNBdXRvKSB7XG4gICAgICAgICAgc2NvcGUuYXV0b21vZGVsLnZhbHVlID0gc2NvcGUuZ3JvdXBbc2NvcGUucHJvcE5hbWVdID09PSB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAvLyBjaGFuZ2UgdGhlIHZhbHVlIHRvIHVuZGVmaW5lZCBpZiBhdXRvIGlzIHRydWVcbiAgICAgICAgICB2YXIgYXV0b01vZGVsV2F0Y2hlciA9IHNjb3BlLiR3YXRjaCgnYXV0b21vZGVsLnZhbHVlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoc2NvcGUuYXV0b21vZGVsLnZhbHVlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgIHNjb3BlLmdyb3VwW3Njb3BlLnByb3BOYW1lXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIENsZWFuIHVwIHdhdGNoZXJcbiAgICAgICAgICAgIGF1dG9Nb2RlbFdhdGNoZXIoKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICB9XG5cbiAgICAgICAgc2NvcGUuaXNSYW5nZSA9IHNjb3BlLm1heCAhPT0gdW5kZWZpbmVkICYmIHNjb3BlLm1pbiAhPT0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3NjaGVtYUxpc3QnLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3NjaGVtYWxpc3Qvc2NoZW1hbGlzdC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBzY29wZToge1xuICAgICAgICBvcmRlckJ5OiAnPCcsXG4gICAgICAgIGZpZWxkRGVmczogJzwnLFxuICAgICAgICBzaG93QWRkOiAnPCdcbiAgICAgIH0sXG4gICAgICByZXBsYWNlOiB0cnVlXG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgcG9sZXN0YXIuZGlyZWN0aXZlOnNjaGVtYUxpc3RJdGVtXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgc2NoZW1hTGlzdEl0ZW1cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdzY2hlbWFMaXN0SXRlbScsIGZ1bmN0aW9uIChQaWxscywgY3FsKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9zY2hlbWFsaXN0L3NjaGVtYWxpc3RpdGVtLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IGZhbHNlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgZmllbGREZWY6ICc9JywgLy8gVE9ETzogZGV0ZXJtaW5lIGlmIGl0J3Mgb25lIHdheVxuICAgICAgICBzaG93QWRkOiAgJzwnLFxuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlKSB7XG4gICAgICAgIHNjb3BlLmlzRW51bVNwZWMgPSBjcWwuZW51bVNwZWMuaXNFbnVtU3BlYztcblxuICAgICAgICBzY29wZS5maWVsZEFkZCA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICAgICAgUGlsbHMuYWRkKGZpZWxkRGVmKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5maWVsZERyYWdTdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBmaWVsZERlZiA9IHNjb3BlLmZpZWxkRGVmO1xuXG4gICAgICAgICAgc2NvcGUucGlsbCA9IHtcbiAgICAgICAgICAgIGZpZWxkOiBmaWVsZERlZi5maWVsZCxcbiAgICAgICAgICAgIHRpdGxlOiBmaWVsZERlZi50aXRsZSxcbiAgICAgICAgICAgIHR5cGU6IGZpZWxkRGVmLnR5cGUsXG4gICAgICAgICAgICBhZ2dyZWdhdGU6IGZpZWxkRGVmLmFnZ3JlZ2F0ZVxuICAgICAgICAgIH07XG4gICAgICAgICAgUGlsbHMuZHJhZ1N0YXJ0KHNjb3BlLnBpbGwsIG51bGwpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmZpZWxkRHJhZ1N0b3AgPSBQaWxscy5kcmFnU3RvcDtcbiAgICAgIH1cbiAgICB9O1xuICB9KTsiLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnc2hlbHZlcycsIGZ1bmN0aW9uKCkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9zaGVsdmVzL3NoZWx2ZXMuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgc3BlYzogJz0nLFxuICAgICAgICBwcmV2aWV3OiAnPCcsXG4gICAgICAgIHN1cHBvcnRBbnk6ICc8J1xuICAgICAgfSxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIEFOWSwgdXRpbCwgdmwsIENvbmZpZywgRGF0YXNldCwgTG9nZ2VyLCBQaWxscykge1xuICAgICAgICAkc2NvcGUuQU5ZID0gQU5ZO1xuICAgICAgICAkc2NvcGUuYW55Q2hhbm5lbElkcyA9IFtdO1xuXG4gICAgICAgICRzY29wZS5tYXJrcyA9IFsncG9pbnQnLCAndGljaycsICdiYXInLCAnbGluZScsICdhcmVhJywgJ3RleHQnXTtcbiAgICAgICAgJHNjb3BlLm1hcmtzV2l0aEFueSA9IFtBTlldLmNvbmNhdCgkc2NvcGUubWFya3MpO1xuXG4gICAgICAgICRzY29wZS5tYXJrQ2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLk1BUktfQ0hBTkdFLCAkc2NvcGUuc3BlYy5tYXJrKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUudHJhbnNwb3NlID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICB2bC5zcGVjLnRyYW5zcG9zZSgkc2NvcGUuc3BlYyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmNsZWFyID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuU1BFQ19DTEVBTiwgJHNjb3BlLnNwZWMpO1xuICAgICAgICAgIFBpbGxzLnJlc2V0KCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHNwZWNXYXRjaGVyID0gJHNjb3BlLiR3YXRjaCgnc3BlYycsIGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICAvLyBwb3B1bGF0ZSBhbnlDaGFubmVsSWRzIHNvIHdlIHNob3cgYWxsIG9yIHRoZW1cbiAgICAgICAgICBpZiAoJHNjb3BlLnN1cHBvcnRBbnkpIHtcbiAgICAgICAgICAgICRzY29wZS5hbnlDaGFubmVsSWRzID0gdXRpbC5rZXlzKHNwZWMuZW5jb2RpbmcpLnJlZHVjZShmdW5jdGlvbihhbnlDaGFubmVsSWRzLCBjaGFubmVsSWQpIHtcbiAgICAgICAgICAgICAgaWYgKFBpbGxzLmlzQW55Q2hhbm5lbChjaGFubmVsSWQpKSB7XG4gICAgICAgICAgICAgICAgYW55Q2hhbm5lbElkcy5wdXNoKGNoYW5uZWxJZCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIGFueUNoYW5uZWxJZHM7XG4gICAgICAgICAgICB9LCBbXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIE9ubHkgY2FsbCBQaWxscy51cGRhdGUsIHdoaWNoIHdpbGwgdHJpZ2dlciBTcGVjLnNwZWMgdG8gdXBkYXRlIGlmIGl0J3Mgbm90IGEgcHJldmlldy5cbiAgICAgICAgICBpZiAoISRzY29wZS5wcmV2aWV3KSB7XG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuU1BFQ19DSEFOR0UsIHNwZWMpO1xuICAgICAgICAgICAgUGlsbHMudXBkYXRlKHNwZWMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7IC8vLCB0cnVlIC8qIHdhdGNoIGVxdWFsaXR5IHJhdGhlciB0aGFuIHJlZmVyZW5jZSAqLyk7XG5cblxuICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIENsZWFuIHVwIHdhdGNoZXJcbiAgICAgICAgICBzcGVjV2F0Y2hlcigpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTp0YWJcbiAqIEBkZXNjcmlwdGlvblxuICogIyB0YWJcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCd0YWInLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3RhYnMvdGFiLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICdeXnRhYnNldCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGhlYWRpbmc6ICdAJ1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgdGFic2V0Q29udHJvbGxlcikge1xuICAgICAgICB0YWJzZXRDb250cm9sbGVyLmFkZFRhYihzY29wZSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6dGFic2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdGFic2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndGFic2V0JywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy90YWJzL3RhYnNldC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0cmFuc2NsdWRlOiB0cnVlLFxuXG4gICAgICAvLyBJbnRlcmZhY2UgZm9yIHRhYnMgdG8gcmVnaXN0ZXIgdGhlbXNlbHZlc1xuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB0aGlzLnRhYnMgPSBbXTtcblxuICAgICAgICB0aGlzLmFkZFRhYiA9IGZ1bmN0aW9uKHRhYlNjb3BlKSB7XG4gICAgICAgICAgLy8gRmlyc3QgdGFiIGlzIGFsd2F5cyBhdXRvLWFjdGl2YXRlZDsgb3RoZXJzIGF1dG8tZGVhY3RpdmF0ZWRcbiAgICAgICAgICB0YWJTY29wZS5hY3RpdmUgPSBzZWxmLnRhYnMubGVuZ3RoID09PSAwO1xuICAgICAgICAgIHNlbGYudGFicy5wdXNoKHRhYlNjb3BlKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnNob3dUYWIgPSBmdW5jdGlvbihzZWxlY3RlZFRhYikge1xuICAgICAgICAgIHNlbGYudGFicy5mb3JFYWNoKGZ1bmN0aW9uKHRhYikge1xuICAgICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIHNlbGVjdGVkIHRhYiwgZGVhY3RpdmF0ZSBhbGwgb3RoZXJzXG4gICAgICAgICAgICB0YWIuYWN0aXZlID0gdGFiID09PSBzZWxlY3RlZFRhYjtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIEV4cG9zZSBjb250cm9sbGVyIHRvIHRlbXBsYXRlcyBhcyBcInRhYnNldFwiXG4gICAgICBjb250cm9sbGVyQXM6ICd0YWJzZXQnXG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndmxQbG90JywgZnVuY3Rpb24odmwsIHZnLCBjcWwsICR0aW1lb3V0LCAkcSwgRGF0YXNldCwgQ29uZmlnLCBjb25zdHMsIF8sICRkb2N1bWVudCwgTG9nZ2VyLCBIZWFwLCAkd2luZG93KSB7XG4gICAgdmFyIGNvdW50ZXIgPSAwO1xuICAgIHZhciBNQVhfQ0FOVkFTX1NJWkUgPSAzMjc2Ny8yLCBNQVhfQ0FOVkFTX0FSRUEgPSAyNjg0MzU0NTYvNDtcblxuICAgIHZhciByZW5kZXJRdWV1ZSA9IG5ldyBIZWFwKGZ1bmN0aW9uKGEsIGIpe1xuICAgICAgICByZXR1cm4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHk7XG4gICAgICB9KSxcbiAgICAgIHJlbmRlcmluZyA9IGZhbHNlO1xuXG4gICAgZnVuY3Rpb24gZ2V0UmVuZGVyZXIod2lkdGgsIGhlaWdodCkge1xuICAgICAgLy8gdXNlIGNhbnZhcyBieSBkZWZhdWx0IGJ1dCB1c2Ugc3ZnIGlmIHRoZSB2aXN1YWxpemF0aW9uIGlzIHRvbyBiaWdcbiAgICAgIGlmICh3aWR0aCA+IE1BWF9DQU5WQVNfU0laRSB8fCBoZWlnaHQgPiBNQVhfQ0FOVkFTX1NJWkUgfHwgd2lkdGgqaGVpZ2h0ID4gTUFYX0NBTlZBU19BUkVBKSB7XG4gICAgICAgIHJldHVybiAnc3ZnJztcbiAgICAgIH1cbiAgICAgIHJldHVybiAnY2FudmFzJztcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3ZscGxvdC92bHBsb3QuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgY2hhcnQ6ICc9JyxcblxuICAgICAgICAvL29wdGlvbmFsXG4gICAgICAgIGRpc2FibGVkOiAnPCcsXG4gICAgICAgIC8qKiBBIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBpZiB0aGUgcGxvdCBpcyBzdGlsbCBpbiB0aGUgdmlldywgc28gaXQgbWlnaHQgYmUgb21pdHRlZCBmcm9tIHRoZSByZW5kZXIgcXVldWUgaWYgbmVjZXNzYXJ5LiAqL1xuICAgICAgICBpc0luTGlzdDogJzwnLFxuICAgICAgICBsaXN0VGl0bGU6ICc8JyxcblxuICAgICAgICBhbHdheXNTY3JvbGxhYmxlOiAnPCcsXG4gICAgICAgIGNvbmZpZ1NldDogJ0AnLFxuICAgICAgICBtYXhIZWlnaHQ6JzwnLFxuICAgICAgICBtYXhXaWR0aDogJzwnLFxuICAgICAgICBvdmVyZmxvdzogJzwnLFxuICAgICAgICBwcmlvcml0eTogJzwnLFxuICAgICAgICByZXNjYWxlOiAnPCcsXG4gICAgICAgIHRodW1ibmFpbDogJzwnLFxuICAgICAgICB0b29sdGlwOiAnPCcsXG4gICAgICB9LFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgIHZhciBIT1ZFUl9USU1FT1VUID0gNTAwLFxuICAgICAgICAgIFRPT0xUSVBfVElNRU9VVCA9IDI1MDtcblxuICAgICAgICB2YXIgdmlldztcblxuICAgICAgICBmdW5jdGlvbiBkZXN0cm95VmlldygpIHtcbiAgICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgICAgdmlldy5vZmYoJ21vdXNlb3ZlcicpO1xuICAgICAgICAgICAgdmlldy5vZmYoJ21vdXNlb3V0Jyk7XG4gICAgICAgICAgICB2aWV3LmRlc3Ryb3koKTtcbiAgICAgICAgICAgIHZpZXcgPSBudWxsO1xuXG4gICAgICAgICAgICB2YXIgc2hvcnRoYW5kID0gZ2V0U2hvcnRoYW5kKCk7XG4gICAgICAgICAgICBpZiAoY29uc3RzLmRlYnVnICYmICR3aW5kb3cudmlld3MpIHtcbiAgICAgICAgICAgICAgZGVsZXRlICR3aW5kb3cudmlld3Nbc2hvcnRoYW5kXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBzY29wZS52aXNJZCA9IChjb3VudGVyKyspO1xuXG4gICAgICAgIHZhciBob3ZlclByb21pc2UgPSBudWxsO1xuICAgICAgICB2YXIgdG9vbHRpcFByb21pc2UgPSBudWxsO1xuICAgICAgICB2YXIgcmVuZGVyUXVldWVOZXh0UHJvbWlzZSA9IG51bGw7XG5cbiAgICAgICAgc2NvcGUuaG92ZXJGb2N1cyA9IGZhbHNlO1xuICAgICAgICBzY29wZS50b29sdGlwQWN0aXZlID0gZmFsc2U7XG4gICAgICAgIHNjb3BlLmRlc3Ryb3llZCA9IGZhbHNlO1xuXG5cblxuICAgICAgICB2YXIgZm9ybWF0ID0gdmcudXRpbC5mb3JtYXQubnVtYmVyKCcnKTtcblxuICAgICAgICBzY29wZS5tb3VzZW92ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBob3ZlclByb21pc2UgPSAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX01PVVNFT1ZFUiwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kLHtcbiAgICAgICAgICAgICAgbGlzdDogc2NvcGUubGlzdFRpdGxlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHNjb3BlLmhvdmVyRm9jdXMgPSAhc2NvcGUudGh1bWJuYWlsO1xuICAgICAgICAgIH0sIEhPVkVSX1RJTUVPVVQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLm1vdXNlb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHNjb3BlLmhvdmVyRm9jdXMpIHtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9NT1VTRU9VVCwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kLCB7XG4gICAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKGhvdmVyUHJvbWlzZSk7XG4gICAgICAgICAgaG92ZXJQcm9taXNlID0gbnVsbDtcblxuICAgICAgICAgIHNjb3BlLmhvdmVyRm9jdXMgPSBzY29wZS51bmxvY2tlZCA9IGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIHZpZXdPbk1vdXNlT3ZlcihldmVudCwgaXRlbSkge1xuICAgICAgICAgIGlmICghaXRlbSB8fCAhaXRlbS5kYXR1bSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRvb2x0aXBQcm9taXNlID0gJHRpbWVvdXQoZnVuY3Rpb24gYWN0aXZhdGVUb29sdGlwKCl7XG5cbiAgICAgICAgICAgIC8vIGF2b2lkIHNob3dpbmcgdG9vbHRpcCBmb3IgZmFjZXQncyBiYWNrZ3JvdW5kXG4gICAgICAgICAgICBpZiAoaXRlbS5kYXR1bS5fZmFjZXRJRCkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLnRvb2x0aXBBY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX1RPT0xUSVAsIGl0ZW0uZGF0dW0sIHtcbiAgICAgICAgICAgICAgc2hvcnRoYW5kOiBzY29wZS5jaGFydC5zaG9ydGhhbmQsXG4gICAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIGNvbnZlcnQgZGF0YSBpbnRvIGEgZm9ybWF0IHRoYXQgd2UgY2FuIGVhc2lseSB1c2Ugd2l0aCBuZyB0YWJsZSBhbmQgbmctcmVwZWF0XG4gICAgICAgICAgICAvLyBUT0RPOiByZXZpc2UgaWYgdGhpcyBpcyBhY3R1YWxseSBhIGdvb2QgaWRlYVxuICAgICAgICAgICAgc2NvcGUuZGF0YSA9IF8oaXRlbS5kYXR1bSkub21pdCgnX3ByZXYnLCAnX2lkJykgLy8gb21pdCB2ZWdhIGludGVybmFsc1xuICAgICAgICAgICAgICAudG9QYWlycygpLnZhbHVlKClcbiAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihwKSB7XG4gICAgICAgICAgICAgICAgcFsxXSA9IHZnLnV0aWwuaXNOdW1iZXIocFsxXSkgPyBmb3JtYXQocFsxXSkgOiBwWzFdO1xuICAgICAgICAgICAgICAgIHJldHVybiBwO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHNjb3BlLiRkaWdlc3QoKTtcblxuICAgICAgICAgICAgdmFyIHRvb2x0aXAgPSBlbGVtZW50LmZpbmQoJy52aXMtdG9vbHRpcCcpLFxuICAgICAgICAgICAgICAkYm9keSA9IGFuZ3VsYXIuZWxlbWVudCgkZG9jdW1lbnQpLFxuICAgICAgICAgICAgICB3aWR0aCA9IHRvb2x0aXAud2lkdGgoKSxcbiAgICAgICAgICAgICAgaGVpZ2h0PSB0b29sdGlwLmhlaWdodCgpO1xuXG4gICAgICAgICAgICAvLyBwdXQgdG9vbHRpcCBhYm92ZSBpZiBpdCdzIG5lYXIgdGhlIHNjcmVlbidzIGJvdHRvbSBib3JkZXJcbiAgICAgICAgICAgIGlmIChldmVudC5wYWdlWSsxMCtoZWlnaHQgPCAkYm9keS5oZWlnaHQoKSkge1xuICAgICAgICAgICAgICB0b29sdGlwLmNzcygndG9wJywgKGV2ZW50LnBhZ2VZKzEwKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0b29sdGlwLmNzcygndG9wJywgKGV2ZW50LnBhZ2VZLTEwLWhlaWdodCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwdXQgdG9vbHRpcCBvbiBsZWZ0IGlmIGl0J3MgbmVhciB0aGUgc2NyZWVuJ3MgcmlnaHQgYm9yZGVyXG4gICAgICAgICAgICBpZiAoZXZlbnQucGFnZVgrMTArIHdpZHRoIDwgJGJvZHkud2lkdGgoKSkge1xuICAgICAgICAgICAgICB0b29sdGlwLmNzcygnbGVmdCcsIChldmVudC5wYWdlWCsxMCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdG9vbHRpcC5jc3MoJ2xlZnQnLCAoZXZlbnQucGFnZVgtMTAtd2lkdGgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LCBUT09MVElQX1RJTUVPVVQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gdmlld09uTW91c2VPdXQoZXZlbnQsIGl0ZW0pIHtcbiAgICAgICAgICAvL2NsZWFyIHBvc2l0aW9uc1xuICAgICAgICAgIHZhciB0b29sdGlwID0gZWxlbWVudC5maW5kKCcudmlzLXRvb2x0aXAnKTtcbiAgICAgICAgICB0b29sdGlwLmNzcygndG9wJywgbnVsbCk7XG4gICAgICAgICAgdG9vbHRpcC5jc3MoJ2xlZnQnLCBudWxsKTtcbiAgICAgICAgICAkdGltZW91dC5jYW5jZWwodG9vbHRpcFByb21pc2UpO1xuICAgICAgICAgIHRvb2x0aXBQcm9taXNlID0gbnVsbDtcblxuICAgICAgICAgIGlmIChzY29wZS50b29sdGlwQWN0aXZlKSB7XG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQ0hBUlRfVE9PTFRJUF9FTkQsIGl0ZW0uZGF0dW0sIHtcbiAgICAgICAgICAgICAgc2hvcnRoYW5kOiBzY29wZS5jaGFydC5zaG9ydGhhbmQsXG4gICAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNjb3BlLnRvb2x0aXBBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICBzY29wZS5kYXRhID0gW107XG4gICAgICAgICAgc2NvcGUuJGRpZ2VzdCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0VmdTcGVjKCkge1xuICAgICAgICAgIHZhciBjb25maWdTZXQgPSBzY29wZS5jb25maWdTZXQgfHwgY29uc3RzLmRlZmF1bHRDb25maWdTZXQgfHwge307XG5cbiAgICAgICAgICBpZiAoIXNjb3BlLmNoYXJ0LnZsU3BlYykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciB2bFNwZWMgPSBfLmNsb25lRGVlcChzY29wZS5jaGFydC52bFNwZWMpO1xuICAgICAgICAgIHZnLnV0aWwuZXh0ZW5kKHZsU3BlYy5jb25maWcsIENvbmZpZ1tjb25maWdTZXRdKCkpO1xuICAgICAgICAgIHJldHVybiB2bC5jb21waWxlKHZsU3BlYykuc3BlYztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFZpc0VsZW1lbnQoKSB7XG4gICAgICAgICAgcmV0dXJuIGVsZW1lbnQuZmluZCgnLnZlZ2EgPiA6Zmlyc3QtY2hpbGQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlc2NhbGVJZkVuYWJsZSgpIHtcbiAgICAgICAgICB2YXIgdmlzRWxlbWVudCA9IGdldFZpc0VsZW1lbnQoKTtcbiAgICAgICAgICBpZiAoc2NvcGUucmVzY2FsZSkge1xuICAgICAgICAgICAgLy8gaGF2ZSB0byBkaWdlc3QgdGhlIHNjb3BlIHRvIGVuc3VyZSB0aGF0XG4gICAgICAgICAgICAvLyBlbGVtZW50LndpZHRoKCkgaXMgYm91bmQgYnkgcGFyZW50IGVsZW1lbnQhXG4gICAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG5cbiAgICAgICAgICAgIHZhciB4UmF0aW8gPSBNYXRoLm1heChcbiAgICAgICAgICAgICAgICAwLjIsXG4gICAgICAgICAgICAgICAgZWxlbWVudC53aWR0aCgpIC8gIC8qIHdpZHRoIG9mIHZscGxvdCBib3VuZGluZyBib3ggKi9cbiAgICAgICAgICAgICAgICBzY29wZS53aWR0aCAvKiB3aWR0aCBvZiB0aGUgdmlzICovXG4gICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmICh4UmF0aW8gPCAxKSB7XG4gICAgICAgICAgICAgIHZpc0VsZW1lbnQud2lkdGgoc2NvcGUud2lkdGggKiB4UmF0aW8pXG4gICAgICAgICAgICAgICAgICAgICAgICAuaGVpZ2h0KHNjb3BlLmhlaWdodCAqIHhSYXRpbyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmlzRWxlbWVudC5jc3MoJ3RyYW5zZm9ybScsIG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgLmNzcygndHJhbnNmb3JtLW9yaWdpbicsIG51bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFNob3J0aGFuZCgpIHtcbiAgICAgICAgICByZXR1cm4gc2NvcGUuY2hhcnQuc2hvcnRoYW5kIHx8IChzY29wZS5jaGFydC52bFNwZWMgPyBjcWwucXVlcnkuc2hvcnRoYW5kLnZsU3BlYyhzY29wZS5jaGFydC52bFNwZWMpIDogJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVuZGVyUXVldWVOZXh0KCkge1xuICAgICAgICAgIC8vIHJlbmRlciBuZXh0IGl0ZW0gaW4gdGhlIHF1ZXVlXG4gICAgICAgICAgaWYgKHJlbmRlclF1ZXVlLnNpemUoKSA+IDApIHtcbiAgICAgICAgICAgIHZhciBuZXh0ID0gcmVuZGVyUXVldWUucG9wKCk7XG4gICAgICAgICAgICBuZXh0LnBhcnNlKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG9yIHNheSB0aGF0IG5vIG9uZSBpcyByZW5kZXJpbmdcbiAgICAgICAgICAgIHJlbmRlcmluZyA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgZnVuY3Rpb24gcmVuZGVyKHNwZWMpIHtcblxuICAgICAgICAgIGlmICghc3BlYykge1xuICAgICAgICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgICAgICAgZGVzdHJveVZpZXcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzY29wZS5oZWlnaHQgPSBzcGVjLmhlaWdodDtcbiAgICAgICAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2NhbiBub3QgZmluZCB2aXMgZWxlbWVudCcpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBzaG9ydGhhbmQgPSBnZXRTaG9ydGhhbmQoKTtcblxuICAgICAgICAgIGZ1bmN0aW9uIHBhcnNlVmVnYSgpIHtcbiAgICAgICAgICAgIC8vIGlmIG5vIGxvbmdlciBhIHBhcnQgb2YgdGhlIGxpc3QsIGNhbmNlbCFcbiAgICAgICAgICAgIGlmIChzY29wZS5kZXN0cm95ZWQgfHwgc2NvcGUuZGlzYWJsZWQgfHwgKHNjb3BlLmlzSW5MaXN0ICYmIHNjb3BlLmNoYXJ0LmZpZWxkU2V0S2V5ICYmICFzY29wZS5pc0luTGlzdChzY29wZS5jaGFydCkpKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYW5jZWwgcmVuZGVyaW5nJywgc2hvcnRoYW5kKTtcbiAgICAgICAgICAgICAgcmVuZGVyUXVldWVOZXh0KCk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHN0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICAvLyByZW5kZXIgaWYgc3RpbGwgYSBwYXJ0IG9mIHRoZSBsaXN0XG4gICAgICAgICAgICB2Zy5wYXJzZS5zcGVjKHNwZWMsIGZ1bmN0aW9uKGVycm9yLCBjaGFydCkge1xuICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdlcnJvcicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICByZW5kZXJRdWV1ZU5leHRQcm9taXNlID0gJHRpbWVvdXQocmVuZGVyUXVldWVOZXh0LCAxKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgZW5kUGFyc2UgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgICAgICBkZXN0cm95VmlldygpO1xuICAgICAgICAgICAgICAgIHZpZXcgPSBjaGFydCh7ZWw6IGVsZW1lbnRbMF19KTtcblxuICAgICAgICAgICAgICAgIGlmICghY29uc3RzLnVzZVVybCkge1xuICAgICAgICAgICAgICAgICAgdmlldy5kYXRhKHtyYXc6IERhdGFzZXQuZGF0YX0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZpZXcudXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgLy8gcmVhZCB3aWR0aCAvIGhlaWdodCBmcm9tIGxheW91dFxuICAgICAgICAgICAgICAgIHZhciBsYXlvdXQgPSB2aWV3LmRhdGEoJ2xheW91dCcpLnZhbHVlcygpWzBdO1xuICAgICAgICAgICAgICAgIHZhciByZW5kZXJlciA9IGdldFJlbmRlcmVyKGxheW91dC53aWR0aCwgbGF5b3V0LmhlaWdodCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlbmRlcmVyID09PSAnc3ZnJykge1xuICAgICAgICAgICAgICAgICAgdmlldy5yZW5kZXJlcihyZW5kZXJlcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHZpc0VsZW1lbnQgPSBlbGVtZW50LmZpbmQoJy52ZWdhID4gOmZpcnN0LWNoaWxkJyk7XG4gICAgICAgICAgICAgICAgLy8gcmVhZCAgPGNhbnZhcz4vPHN2Zz7igJlzIHdpZHRoIGFuZCBoZWlnaHQsIHdoaWNoIGlzIHZlZ2EncyBvdXRlciB3aWR0aCBhbmQgaGVpZ2h0IHRoYXQgaW5jbHVkZXMgYXhlcyBhbmQgbGVnZW5kc1xuICAgICAgICAgICAgICAgIHNjb3BlLndpZHRoID0gIHZpc0VsZW1lbnQud2lkdGgoKTtcbiAgICAgICAgICAgICAgICBzY29wZS5oZWlnaHQgPSB2aXNFbGVtZW50LmhlaWdodCgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGNvbnN0cy5kZWJ1Zykge1xuICAgICAgICAgICAgICAgICAgJHdpbmRvdy52aWV3cyA9ICR3aW5kb3cudmlld3MgfHwge307XG4gICAgICAgICAgICAgICAgICAkd2luZG93LnZpZXdzW3Nob3J0aGFuZF0gPSB2aWV3O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9SRU5ERVIsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCwge1xuICAgICAgICAgICAgICAgICAgbGlzdDogc2NvcGUubGlzdFRpdGxlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmVzY2FsZUlmRW5hYmxlKCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZW5kQ2hhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncGFyc2Ugc3BlYycsIChlbmRQYXJzZS1zdGFydCksICdjaGFydGluZycsIChlbmRDaGFydC1lbmRQYXJzZSksIHNob3J0aGFuZCk7XG4gICAgICAgICAgICAgICAgaWYgKHNjb3BlLnRvb2x0aXApIHtcbiAgICAgICAgICAgICAgICAgIHZpZXcub24oJ21vdXNlb3ZlcicsIHZpZXdPbk1vdXNlT3Zlcik7XG4gICAgICAgICAgICAgICAgICB2aWV3Lm9uKCdtb3VzZW91dCcsIHZpZXdPbk1vdXNlT3V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUsIEpTT04uc3RyaW5naWZ5KHNwZWMpKTtcbiAgICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICByZW5kZXJRdWV1ZU5leHRQcm9taXNlID0gJHRpbWVvdXQocmVuZGVyUXVldWVOZXh0LCAxKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIXJlbmRlcmluZykgeyAvLyBpZiBubyBpbnN0YW5jZSBpcyBiZWluZyByZW5kZXIgLS0gcmVuZGVyaW5nIG5vd1xuICAgICAgICAgICAgcmVuZGVyaW5nPXRydWU7XG4gICAgICAgICAgICBwYXJzZVZlZ2EoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIHF1ZXVlIGl0XG4gICAgICAgICAgICByZW5kZXJRdWV1ZS5wdXNoKHtcbiAgICAgICAgICAgICAgcHJpb3JpdHk6IHNjb3BlLnByaW9yaXR5IHx8IDAsXG4gICAgICAgICAgICAgIHBhcnNlOiBwYXJzZVZlZ2FcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzcGVjV2F0Y2hlciA9IHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBPbWl0IGRhdGEgcHJvcGVydHkgdG8gc3BlZWQgdXAgZGVlcCB3YXRjaFxuICAgICAgICAgIHJldHVybiBfLm9taXQoc2NvcGUuY2hhcnQudmxTcGVjLCAnZGF0YScpO1xuICAgICAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgc3BlYyA9IHNjb3BlLmNoYXJ0LnZnU3BlYyA9IGdldFZnU3BlYygpO1xuICAgICAgICAgIGlmICghc2NvcGUuY2hhcnQuY2xlYW5TcGVjKSB7XG4gICAgICAgICAgICAvLyBGSVhNRVxuICAgICAgICAgICAgc2NvcGUuY2hhcnQuY2xlYW5TcGVjID0gc2NvcGUuY2hhcnQudmxTcGVjO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZW5kZXIoc3BlYyk7XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygndmxwbG90IGRlc3Ryb3llZCcpO1xuICAgICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgICBkZXN0cm95VmlldygpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChob3ZlclByb21pc2UpIHtcbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChob3ZlclByb21pc2UpO1xuICAgICAgICAgICAgaG92ZXJQcm9taXNlID0gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodG9vbHRpcFByb21pc2UpIHtcbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbCh0b29sdGlwUHJvbWlzZSk7XG4gICAgICAgICAgICB0b29sdGlwUHJvbWlzZSA9IG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gaWYgKHJlbmRlclF1ZXVlTmV4dFByb21pc2UpIHtcbiAgICAgICAgICAvLyAgICR0aW1lb3V0LmNhbmNlbChyZW5kZXJRdWV1ZU5leHRQcm9taXNlKTtcbiAgICAgICAgICAvLyAgIHJlbmRlclF1ZXVlTmV4dFByb21pc2UgPSBudWxsO1xuICAgICAgICAgIC8vIH1cblxuICAgICAgICAgIHNjb3BlLmRlc3Ryb3llZCA9IHRydWU7XG4gICAgICAgICAgLy8gRklYTUUgYW5vdGhlciB3YXkgdGhhdCBzaG91bGQgZWxpbWluYXRlIHRoaW5ncyBmcm9tIG1lbW9yeSBmYXN0ZXIgc2hvdWxkIGJlIHJlbW92aW5nXG4gICAgICAgICAgLy8gbWF5YmUgc29tZXRoaW5nIGxpa2VcbiAgICAgICAgICAvLyByZW5kZXJRdWV1ZS5zcGxpY2UocmVuZGVyUXVldWUuaW5kZXhPZihwYXJzZVZlZ2EpLCAxKSk7XG4gICAgICAgICAgLy8gYnV0IHdpdGhvdXQgcHJvcGVyIHRlc3RpbmcsIHRoaXMgaXMgcmlza2llciB0aGFuIHNldHRpbmcgc2NvcGUuZGVzdHJveWVkLlxuXG4gICAgICAgICAgLy8gQ2xlYW4gdXAgd2F0Y2hlclxuICAgICAgICAgIHNwZWNXYXRjaGVyKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5kaXJlY3RpdmU6dmlzTGlzdEl0ZW1cbiAqIEBkZXNjcmlwdGlvblxuICogIyB2aXNMaXN0SXRlbVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdEdyb3VwJywgZnVuY3Rpb24gKEJvb2ttYXJrcywgY29uc3RzLCB2ZywgdmwsIERhdGFzZXQsIExvZ2dlciwgXywgUGlsbHMsIENoYXJ0LCAkdGltZW91dCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdmxwbG90Z3JvdXAvdmxwbG90Z3JvdXAuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgJGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5nZXREcm9wVGFyZ2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuICRlbGVtZW50LmZpbmQoJy5mYS13cmVuY2gnKVswXTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICBzY29wZToge1xuICAgICAgICAvKiBwYXNzIHRvIHZscGxvdCAqKi9cbiAgICAgICAgY2hhcnQ6ICc9JyxcblxuICAgICAgICAvL29wdGlvbmFsXG4gICAgICAgIGRpc2FibGVkOiAnPCcsXG4gICAgICAgIGlzSW5MaXN0OiAnPCcsXG4gICAgICAgIGxpc3RUaXRsZTogJzwnLFxuXG4gICAgICAgIGFsd2F5c1Njcm9sbGFibGU6ICc8JyxcbiAgICAgICAgY29uZmlnU2V0OiAnQCcsXG4gICAgICAgIGVuYWJsZVBpbGxzUHJldmlldzogJzwnLFxuICAgICAgICBtYXhIZWlnaHQ6ICc8JyxcbiAgICAgICAgbWF4V2lkdGg6ICc8JyxcbiAgICAgICAgb3ZlcmZsb3c6ICc8JyxcbiAgICAgICAgcHJpb3JpdHk6ICc8JyxcbiAgICAgICAgcmVzY2FsZTogJzwnLFxuICAgICAgICB0aHVtYm5haWw6ICc8JyxcbiAgICAgICAgdG9vbHRpcDogJzwnLFxuXG4gICAgICAgIC8qIHZscGxvdGdyb3VwIHNwZWNpZmljICovXG5cbiAgICAgICAgLyoqIFNldCBvZiBmaWVsZERlZnMgZm9yIHNob3dpbmcgZmllbGQgaW5mby4gIEZvciBWb3lhZ2VyMiwgdGhpcyBtaWdodCBiZSBqdXN0IGEgc3Vic2V0IG9mIGZpZWxkcyB0aGF0IGFyZSBhbWJpZ3VvdXMuICovXG4gICAgICAgIGZpZWxkU2V0OiAnPCcsXG5cbiAgICAgICAgc2hvd0Jvb2ttYXJrOiAnPCcsXG4gICAgICAgIHNob3dEZWJ1ZzogJzwnLFxuICAgICAgICBzaG93RXhwYW5kOiAnPCcsXG4gICAgICAgIHNob3dGaWx0ZXJOdWxsOiAnPCcsXG4gICAgICAgIHNob3dMYWJlbDogJzwnLFxuICAgICAgICBzaG93TG9nOiAnPCcsXG4gICAgICAgIHNob3dTZWxlY3Q6ICc8JyxcbiAgICAgICAgc2hvd1NvcnQ6ICc8JyxcbiAgICAgICAgc2hvd1RyYW5zcG9zZTogJzwnLFxuXG4gICAgICAgIC8qKiBXaGV0aGVyIHRoZSBsb2cgLyB0cmFuc3Bvc2Ugc29ydCBjYXVzZSBzaWRlIGVmZmVjdCB0byB0aGUgc2hlbGYgICovXG4gICAgICAgIHRvZ2dsZVNoZWxmOiAnPCcsXG5cbiAgICAgICAgYWx3YXlzU2VsZWN0ZWQ6ICc8JyxcbiAgICAgICAgaXNTZWxlY3RlZDogJzwnLFxuICAgICAgICBoaWdobGlnaHRlZDogJzwnLFxuICAgICAgICBleHBhbmRBY3Rpb246ICcmJyxcbiAgICAgICAgc2VsZWN0QWN0aW9uOiAnJidcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSkge1xuICAgICAgICBzY29wZS5Cb29rbWFya3MgPSBCb29rbWFya3M7XG4gICAgICAgIHNjb3BlLmNvbnN0cyA9IGNvbnN0cztcbiAgICAgICAgc2NvcGUuaG92ZXJlZCA9IGZhbHNlO1xuXG4gICAgICAgIC8vIGJvb2ttYXJrIGFsZXJ0XG4gICAgICAgIHNjb3BlLnNob3dCb29rbWFya0FsZXJ0ID0gZmFsc2U7XG4gICAgICAgIHNjb3BlLnRvZ2dsZUJvb2ttYXJrID0gZnVuY3Rpb24oY2hhcnQpIHtcbiAgICAgICAgICBpZiAoQm9va21hcmtzLmlzQm9va21hcmtlZChjaGFydC5zaG9ydGhhbmQpKSB7XG4gICAgICAgICAgICBzY29wZS5zaG93Qm9va21hcmtBbGVydCA9ICFzY29wZS5zaG93Qm9va21hcmtBbGVydDsgLy8gdG9nZ2xlIGFsZXJ0XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgQm9va21hcmtzLmFkZChjaGFydCwgc2NvcGUubGlzdFRpdGxlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGhvdmVyUHJvbWlzZSA9IG51bGw7XG5cbiAgICAgICAgc2NvcGUuZmllbGRJbmZvTW91c2VvdmVyID0gZnVuY3Rpb24oZmllbGREZWYsIGluZGV4KSB7XG4gICAgICAgICAgc2NvcGUuaG92ZXJlZCA9IHRydWU7XG5cbiAgICAgICAgICBob3ZlclByb21pc2UgPSAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIChzY29wZS5oaWdobGlnaHRlZHx8e30pW2ZpZWxkRGVmLmZpZWxkXSA9IHRydWU7XG5cbiAgICAgICAgICAgIC8vIExpbmsgdG8gb3JpZ2luYWwgZmllbGQgaW4gdGhlIENRTC1iYXNlZCBzcGVjXG4gICAgICAgICAgICBpZiAoc2NvcGUuY2hhcnQuZW51bVNwZWNJbmRleCkge1xuICAgICAgICAgICAgICB2YXIgZW51bVNwZWNJbmRleCA9IHNjb3BlLmNoYXJ0LmVudW1TcGVjSW5kZXg7XG4gICAgICAgICAgICAgIGlmIChlbnVtU3BlY0luZGV4LmVuY29kaW5ncyAmJiBlbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0gJiYgZW51bVNwZWNJbmRleC5lbmNvZGluZ3NbaW5kZXhdLmZpZWxkKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkRW51bVNwZWNOYW1lID0gZW51bVNwZWNJbmRleC5lbmNvZGluZ3NbaW5kZXhdLmZpZWxkLm5hbWU7XG4gICAgICAgICAgICAgICAgKHNjb3BlLmhpZ2hsaWdodGVkfHx7fSlbZmllbGRFbnVtU3BlY05hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuRklFTERERUZfSElHSExJR0hURUQsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCwge1xuICAgICAgICAgICAgICBoaWdobGlnaHRlZEZpZWxkOiBmaWVsZERlZi5maWVsZCxcbiAgICAgICAgICAgICAgbGlzdDogc2NvcGUubGlzdFRpdGxlXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHNjb3BlLmVuYWJsZVBpbGxzUHJldmlldykge1xuICAgICAgICAgICAgICBQaWxscy5wcmV2aWV3KHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5maWVsZEluZm9Nb3VzZW91dCA9IGZ1bmN0aW9uKGZpZWxkRGVmLCBpbmRleCkge1xuICAgICAgICAgIHNjb3BlLmhvdmVyZWQgPSBmYWxzZTtcblxuICAgICAgICAgIGlmIChob3ZlclByb21pc2UpIHtcbiAgICAgICAgICAgIC8vIGlmIHdlIHVuaG92ZXIgd2l0aGluXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoaG92ZXJQcm9taXNlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaG92ZXJQcm9taXNlID0gbnVsbDtcblxuICAgICAgICAgIGlmICgoc2NvcGUuaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZERlZi5maWVsZF0pIHtcbiAgICAgICAgICAgIC8vIGRpc2FibGUgcHJldmlldyBpZiBpdCdzIGVuYWJsZWRcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5GSUVMRERFRl9VTkhJR0hMSUdIVEVELCBzY29wZS5jaGFydC5zaG9ydGhhbmQsIHtcbiAgICAgICAgICAgICAgaGlnaGxpZ2h0ZWRGaWVsZDogZmllbGREZWYuZmllbGQsXG4gICAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIChzY29wZS5oaWdobGlnaHRlZHx8e30pW2ZpZWxkRGVmLmZpZWxkXSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBVbmxpbmsgTGluayB0byBvcmlnaW5hbCBmaWVsZCBpbiB0aGUgQ1FMLWJhc2VkIHNwZWNcbiAgICAgICAgICAgIGlmIChzY29wZS5jaGFydC5lbnVtU3BlY0luZGV4KSB7XG4gICAgICAgICAgICAgIHZhciBlbnVtU3BlY0luZGV4ID0gc2NvcGUuY2hhcnQuZW51bVNwZWNJbmRleDtcbiAgICAgICAgICAgICAgaWYgKGVudW1TcGVjSW5kZXguZW5jb2RpbmdzICYmIGVudW1TcGVjSW5kZXguZW5jb2RpbmdzW2luZGV4XSAmJiBlbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0uZmllbGQpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmllbGRFbnVtU3BlY05hbWUgPSBlbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0uZmllbGQubmFtZTtcbiAgICAgICAgICAgICAgICBkZWxldGUgKHNjb3BlLmhpZ2hsaWdodGVkfHx7fSlbZmllbGRFbnVtU3BlY05hbWVdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzY29wZS5lbmFibGVQaWxsc1ByZXZpZXcpIHtcbiAgICAgICAgICAgICAgUGlsbHMucHJldmlldyhudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuaXNFbnVtZXJhdGVkRmllbGQgPSBmdW5jdGlvbihjaGFydCwgaW5kZXgpIHtcbiAgICAgICAgICBpZiAoY2hhcnQuZW51bVNwZWNJbmRleCkge1xuICAgICAgICAgICAgaWYgKGNoYXJ0LmVudW1TcGVjSW5kZXguZW5jb2RpbmdzICYmIGNoYXJ0LmVudW1TcGVjSW5kZXguZW5jb2RpbmdzW2luZGV4XSkge1xuICAgICAgICAgICAgICByZXR1cm4gY2hhcnQuZW51bVNwZWNJbmRleC5lbmNvZGluZ3NbaW5kZXhdLmZpZWxkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuaXNFbnVtZXJhdGVkQ2hhbm5lbCA9IGZ1bmN0aW9uKGNoYXJ0LCBpbmRleCkge1xuICAgICAgICAgIGlmIChjaGFydC5lbnVtU3BlY0luZGV4KSB7XG4gICAgICAgICAgICBpZiAoY2hhcnQuZW51bVNwZWNJbmRleC5lbmNvZGluZ3MgJiYgY2hhcnQuZW51bVNwZWNJbmRleC5lbmNvZGluZ3NbaW5kZXhdKSB7XG4gICAgICAgICAgICAgIHJldHVybiBjaGFydC5lbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0uY2hhbm5lbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnJlbW92ZUJvb2ttYXJrID0gZnVuY3Rpb24oY2hhcnQpIHtcbiAgICAgICAgICBCb29rbWFya3MucmVtb3ZlKGNoYXJ0KTtcbiAgICAgICAgICBzY29wZS5zaG93Qm9va21hcmtBbGVydCA9IGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmtlZXBCb29rbWFyayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLnNob3dCb29rbWFya0FsZXJ0ID0gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRGVmZXIgcmVuZGVyaW5nIHRoZSBkZWJ1ZyBEcm9wIHBvcHVwIHVudGlsIGl0IGlzIHJlcXVlc3RlZFxuICAgICAgICBzY29wZS5yZW5kZXJQb3B1cCA9IGZhbHNlO1xuICAgICAgICAvLyBVc2UgXy5vbmNlIGJlY2F1c2UgdGhlIHBvcHVwIG9ubHkgbmVlZHMgdG8gYmUgaW5pdGlhbGl6ZWQgb25jZVxuICAgICAgICBzY29wZS5pbml0aWFsaXplUG9wdXAgPSBfLm9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUucmVuZGVyUG9wdXAgPSB0cnVlO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS5sb2dDb2RlID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhuYW1lKyc6XFxuXFxuJywgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUT0dHTEUgTE9HXG5cbiAgICAgICAgc2NvcGUubG9nID0ge307XG4gICAgICAgIHNjb3BlLmxvZy5zdXBwb3J0ID0gZnVuY3Rpb24oc3BlYywgY2hhbm5lbCkge1xuICAgICAgICAgIGlmICghc3BlYykgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgICB2YXIgZW5jb2RpbmcgPSBzcGVjLmVuY29kaW5nLFxuICAgICAgICAgICAgZmllbGREZWYgPSBlbmNvZGluZ1tjaGFubmVsXTtcblxuICAgICAgICAgIHJldHVybiBmaWVsZERlZiAmJiBmaWVsZERlZi50eXBlID09PSB2bC50eXBlLlFVQU5USVRBVElWRSAmJiAhZmllbGREZWYuYmluO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmxvZy50b2dnbGUgPSBmdW5jdGlvbihzcGVjLCBjaGFubmVsKSB7XG4gICAgICAgICAgaWYgKCFzY29wZS5sb2cuc3VwcG9ydChzcGVjLCBjaGFubmVsKSkgeyByZXR1cm47IH1cblxuICAgICAgICAgIHZhciBmaWVsZERlZiA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbF0sXG4gICAgICAgICAgICBzY2FsZSA9IGZpZWxkRGVmLnNjYWxlID0gZmllbGREZWYuc2NhbGUgfHwge307XG5cbiAgICAgICAgICBpZiAoc2NvcGUudG9nZ2xlU2hlbGYpIHtcbiAgICAgICAgICAgIFBpbGxzLnJlc2NhbGUoY2hhbm5lbCwgc2NhbGUudHlwZSA9PT0gJ2xvZycgPyAnbGluZWFyJyA6ICdsb2cnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2NhbGUudHlwZSA9IHNjYWxlLnR5cGUgPT09ICdsb2cnID8gJ2xpbmVhcicgOiAnbG9nJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuTE9HX1RPR0dMRSwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kLCB7XG4gICAgICAgICAgICBsaXN0OiBzY29wZS5saXN0VGl0bGVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5sb2cuYWN0aXZlID0gZnVuY3Rpb24oc3BlYywgY2hhbm5lbCkge1xuICAgICAgICAgIGlmICghc2NvcGUubG9nLnN1cHBvcnQoc3BlYywgY2hhbm5lbCkpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICB2YXIgZmllbGREZWYgPSBzcGVjLmVuY29kaW5nW2NoYW5uZWxdLFxuICAgICAgICAgICAgc2NhbGUgPSBmaWVsZERlZi5zY2FsZTtcblxuICAgICAgICAgIHJldHVybiBzY2FsZSAmJiBzY2FsZS50eXBlID09PSAnbG9nJztcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUT0dHTEUgRklMVEVSXG4gICAgICAgIC8vIFRPRE86IGV4dHJhY3QgdG9nZ2xlRmlsdGVyTnVsbCB0byBiZSBpdHMgb3duIGNsYXNzXG5cbiAgICAgICAgc2NvcGUudG9nZ2xlRmlsdGVyTnVsbCA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuTlVMTF9GSUxURVJfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQsIHtcbiAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKHNjb3BlLnRvZ2dsZVNoZWxmKSB7XG4gICAgICAgICAgICBQaWxscy50b2dnbGVGaWx0ZXJJbnZhbGlkKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNwZWMudHJhbnNmb3JtID0gc3BlYy50cmFuc2Zvcm0gfHwge307XG4gICAgICAgICAgICBzcGVjLnRyYW5zZm9ybS5maWx0ZXJJbnZhbGlkID0gc3BlYy50cmFuc2Zvcm0uZmlsdGVySW52YWxpZCA9PT0gdHJ1ZSA/IHVuZGVmaW5lZCA6IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnRvZ2dsZUZpbHRlck51bGwuc3VwcG9ydCA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICB2YXIgZmllbGREZWZzID0gdmwuc3BlYy5maWVsZERlZnMoc3BlYyk7XG4gICAgICAgICAgZm9yICh2YXIgaSBpbiBmaWVsZERlZnMpIHtcbiAgICAgICAgICAgIHZhciBmaWVsZERlZiA9IGZpZWxkRGVmc1tpXTtcbiAgICAgICAgICAgIGlmIChfLmluY2x1ZGVzKFt2bC50eXBlLk9SRElOQUwsIHZsLnR5cGUuTk9NSU5BTF0sIGZpZWxkRGVmLnR5cGUpICYmIERhdGFzZXQuc2NoZW1hLnN0YXRzKGZpZWxkRGVmKS5taXNzaW5nID4gMCkge1xuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRPR0dMRSBTT1JUXG4gICAgICAgIC8vIFRPRE86IGV4dHJhY3QgdG9nZ2xlU29ydCB0byBiZSBpdHMgb3duIGNsYXNzXG5cbiAgICAgICAgdmFyIHRvZ2dsZVNvcnQgPSBzY29wZS50b2dnbGVTb3J0ID0ge307XG5cbiAgICAgICAgdG9nZ2xlU29ydC5tb2RlcyA9IFsnb3JkaW5hbC1hc2NlbmRpbmcnLCAnb3JkaW5hbC1kZXNjZW5kaW5nJyxcbiAgICAgICAgICAncXVhbnRpdGF0aXZlLWFzY2VuZGluZycsICdxdWFudGl0YXRpdmUtZGVzY2VuZGluZycsICdjdXN0b20nXTtcblxuICAgICAgICB0b2dnbGVTb3J0LnRvZ2dsZSA9IGZ1bmN0aW9uKHNwZWMpIHtcblxuICAgICAgICAgIHZhciBjdXJyZW50TW9kZSA9IHRvZ2dsZVNvcnQubW9kZShzcGVjKTtcbiAgICAgICAgICB2YXIgY3VycmVudE1vZGVJbmRleCA9IHRvZ2dsZVNvcnQubW9kZXMuaW5kZXhPZihjdXJyZW50TW9kZSk7XG5cbiAgICAgICAgICB2YXIgbmV3TW9kZUluZGV4ID0gKGN1cnJlbnRNb2RlSW5kZXggKyAxKSAlICh0b2dnbGVTb3J0Lm1vZGVzLmxlbmd0aCAtIDEpO1xuICAgICAgICAgIHZhciBuZXdNb2RlID0gdG9nZ2xlU29ydC5tb2Rlc1tuZXdNb2RlSW5kZXhdO1xuXG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLlNPUlRfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQsIHtcbiAgICAgICAgICAgIGN1cnJlbnRNb2RlOiBjdXJyZW50TW9kZSxcbiAgICAgICAgICAgIG5ld01vZGU6IG5ld01vZGUsXG4gICAgICAgICAgICBsaXN0OiBzY29wZS5saXN0VGl0bGVcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHZhciBjaGFubmVscyA9IHRvZ2dsZVNvcnQuY2hhbm5lbHMoc3BlYyk7XG5cbiAgICAgICAgICBpZiAoc2NvcGUudG9nZ2xlU2hlbGYpIHtcbiAgICAgICAgICAgIFBpbGxzLnNvcnQoY2hhbm5lbHMub3JkaW5hbCwgdG9nZ2xlU29ydC5nZXRTb3J0KG5ld01vZGUsIHNwZWMpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3BlYy5lbmNvZGluZ1tjaGFubmVscy5vcmRpbmFsXS5zb3J0ID0gdG9nZ2xlU29ydC5nZXRTb3J0KG5ld01vZGUsIHNwZWMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKiogR2V0IHNvcnQgcHJvcGVydHkgZGVmaW5pdGlvbiB0aGF0IG1hdGNoZXMgZWFjaCBtb2RlLiAqL1xuICAgICAgICB0b2dnbGVTb3J0LmdldFNvcnQgPSBmdW5jdGlvbihtb2RlLCBzcGVjKSB7XG4gICAgICAgICAgaWYgKG1vZGUgPT09ICdvcmRpbmFsLWFzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiAnYXNjZW5kaW5nJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobW9kZSA9PT0gJ29yZGluYWwtZGVzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiAnZGVzY2VuZGluZyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGNoYW5uZWxzID0gdG9nZ2xlU29ydC5jaGFubmVscyhzcGVjKTtcbiAgICAgICAgICB2YXIgcUVuY0RlZiA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbHMucXVhbnRpdGF0aXZlXTtcblxuICAgICAgICAgIGlmIChtb2RlID09PSAncXVhbnRpdGF0aXZlLWFzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIG9wOiBxRW5jRGVmLmFnZ3JlZ2F0ZSxcbiAgICAgICAgICAgICAgZmllbGQ6IHFFbmNEZWYuZmllbGQsXG4gICAgICAgICAgICAgIG9yZGVyOiAnYXNjZW5kaW5nJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobW9kZSA9PT0gJ3F1YW50aXRhdGl2ZS1kZXNjZW5kaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgb3A6IHFFbmNEZWYuYWdncmVnYXRlLFxuICAgICAgICAgICAgICBmaWVsZDogcUVuY0RlZi5maWVsZCxcbiAgICAgICAgICAgICAgb3JkZXI6ICdkZXNjZW5kaW5nJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICB0b2dnbGVTb3J0Lm1vZGUgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgdmFyIGNoYW5uZWxzID0gdG9nZ2xlU29ydC5jaGFubmVscyhzcGVjKTtcbiAgICAgICAgICB2YXIgc29ydCA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbHMub3JkaW5hbF0uc29ydDtcblxuICAgICAgICAgIGlmIChzb3J0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiAnb3JkaW5hbC1hc2NlbmRpbmcnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG9nZ2xlU29ydC5tb2Rlcy5sZW5ndGggLSAxIDsgaSsrKSB7XG4gICAgICAgICAgICAvLyBjaGVjayBpZiBzb3J0IG1hdGNoZXMgYW55IG9mIHRoZSBzb3J0IGZvciBlYWNoIG1vZGUgZXhjZXB0ICdjdXN0b20nLlxuICAgICAgICAgICAgdmFyIG1vZGUgPSB0b2dnbGVTb3J0Lm1vZGVzW2ldO1xuICAgICAgICAgICAgdmFyIHNvcnRPZk1vZGUgPSB0b2dnbGVTb3J0LmdldFNvcnQobW9kZSwgc3BlYyk7XG5cbiAgICAgICAgICAgIGlmIChfLmlzRXF1YWwoc29ydCwgc29ydE9mTW9kZSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG1vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHZnLnV0aWwuaXNPYmplY3Qoc29ydCkgJiYgc29ydC5vcCAmJiBzb3J0LmZpZWxkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2N1c3RvbSc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2ludmFsaWQgbW9kZScpO1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQuY2hhbm5lbHMgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgcmV0dXJuIHNwZWMuZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk5PTUlOQUwgfHwgc3BlYy5lbmNvZGluZy54LnR5cGUgPT09IHZsLnR5cGUuT1JESU5BTCA/XG4gICAgICAgICAgICAgICAgICB7b3JkaW5hbDogJ3gnLCBxdWFudGl0YXRpdmU6ICd5J30gOlxuICAgICAgICAgICAgICAgICAge29yZGluYWw6ICd5JywgcXVhbnRpdGF0aXZlOiAneCd9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQuc3VwcG9ydCA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICB2YXIgZW5jb2RpbmcgPSBzcGVjLmVuY29kaW5nO1xuXG4gICAgICAgICAgaWYgKHZsLmVuY29kaW5nLmhhcyhlbmNvZGluZywgJ3JvdycpIHx8IHZsLmVuY29kaW5nLmhhcyhlbmNvZGluZywgJ2NvbHVtbicpIHx8XG4gICAgICAgICAgICAhdmwuZW5jb2RpbmcuaGFzKGVuY29kaW5nLCAneCcpIHx8ICF2bC5lbmNvZGluZy5oYXMoZW5jb2RpbmcsICd5JykgfHxcbiAgICAgICAgICAgICF2bC5lbmNvZGluZy5pc0FnZ3JlZ2F0ZShzcGVjLmVuY29kaW5nKSkgeyAvLyBGSVhNRSByZXBsYWNlIHRoaXMgcHJvcGVyIGFsd2F5c05vT2NjbHVzaW9uIG1ldGhvZFxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgIChlbmNvZGluZy54LnR5cGUgPT09IHZsLnR5cGUuTk9NSU5BTCB8fCBlbmNvZGluZy54LnR5cGUgPT09IHZsLnR5cGUuT1JESU5BTCkgJiZcbiAgICAgICAgICAgICAgdmwuZmllbGREZWYuaXNNZWFzdXJlKGVuY29kaW5nLnkpXG4gICAgICAgICAgICApID8gJ3gnIDpcbiAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgKGVuY29kaW5nLnkudHlwZSA9PT0gdmwudHlwZS5OT01JTkFMIHx8IGVuY29kaW5nLnkudHlwZSA9PT0gdmwudHlwZS5PUkRJTkFMKSAmJlxuICAgICAgICAgICAgICB2bC5maWVsZERlZi5pc01lYXN1cmUoZW5jb2RpbmcueClcbiAgICAgICAgICAgICkgPyAneScgOiBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS50b2dnbGVTb3J0Q2xhc3MgPSBmdW5jdGlvbih2bFNwZWMpIHtcbiAgICAgICAgICBpZiAoIXZsU3BlYyB8fCAhdG9nZ2xlU29ydC5zdXBwb3J0KHZsU3BlYykpIHtcbiAgICAgICAgICAgIHJldHVybiAnaW52aXNpYmxlJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgb3JkaW5hbENoYW5uZWwgPSB2bFNwZWMgJiYgdG9nZ2xlU29ydC5jaGFubmVscyh2bFNwZWMpLm9yZGluYWwsXG4gICAgICAgICAgICBtb2RlID0gdmxTcGVjICYmIHRvZ2dsZVNvcnQubW9kZSh2bFNwZWMpO1xuXG4gICAgICAgICAgdmFyIGRpcmVjdGlvbkNsYXNzID0gb3JkaW5hbENoYW5uZWwgPT09ICd4JyA/ICdzb3J0LXggJyA6ICcnO1xuXG4gICAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICBjYXNlICdvcmRpbmFsLWFzY2VuZGluZyc6XG4gICAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb25DbGFzcyArICdmYS1zb3J0LWFscGhhLWFzYyc7XG4gICAgICAgICAgICBjYXNlICdvcmRpbmFsLWRlc2NlbmRpbmcnOlxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydC1hbHBoYS1kZXNjJztcbiAgICAgICAgICAgIGNhc2UgJ3F1YW50aXRhdGl2ZS1hc2NlbmRpbmcnOlxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydC1hbW91bnQtYXNjJztcbiAgICAgICAgICAgIGNhc2UgJ3F1YW50aXRhdGl2ZS1kZXNjZW5kaW5nJzpcbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQtYW1vdW50LWRlc2MnO1xuICAgICAgICAgICAgZGVmYXVsdDogLy8gY3VzdG9tXG4gICAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb25DbGFzcyArICdmYS1zb3J0JztcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUudHJhbnNwb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLlRSQU5TUE9TRV9UT0dHTEUsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCwge1xuICAgICAgICAgICAgbGlzdDogc2NvcGUubGlzdFRpdGxlXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKHNjb3BlLnRvZ2dsZVNoZWxmKSB7XG4gICAgICAgICAgICBQaWxscy50cmFuc3Bvc2UoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgQ2hhcnQudHJhbnNwb3NlKHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzY29wZS5jaGFydCA9IG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5kaXJlY3RpdmU6dmlzTGlzdEl0ZW1cbiAqIEBkZXNjcmlwdGlvblxuICogIyB2aXNMaXN0SXRlbVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdEdyb3VwUG9wdXAnLCBmdW5jdGlvbiAoRHJvcCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdmxwbG90Z3JvdXAvdmxwbG90Z3JvdXBwb3B1cC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnXl52bFBsb3RHcm91cCcsXG4gICAgICBzY29wZTogZmFsc2UsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIHZsUGxvdEdyb3VwQ29udHJvbGxlcikge1xuICAgICAgICB2YXIgZGVidWdQb3B1cCA9IG5ldyBEcm9wKHtcbiAgICAgICAgICBjb250ZW50OiBlbGVtZW50LmZpbmQoJy5kZXYtdG9vbCcpWzBdLFxuICAgICAgICAgIHRhcmdldDogdmxQbG90R3JvdXBDb250cm9sbGVyLmdldERyb3BUYXJnZXQoKSxcbiAgICAgICAgICBwb3NpdGlvbjogJ2JvdHRvbSByaWdodCcsXG4gICAgICAgICAgb3Blbk9uOiAnY2xpY2snLFxuICAgICAgICAgIGNvbnN0cmFpblRvV2luZG93OiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBkZWJ1Z1BvcHVwLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndmxQbG90R3JvdXBMaXN0JywgZnVuY3Rpb24gKHZsLCBjcWwsIGpRdWVyeSwgY29uc3RzLCBfLCBMb2dnZXIsIFBpbGxzLCBDaGFydCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdmxwbG90Z3JvdXBsaXN0L3ZscGxvdGdyb3VwbGlzdC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgLyoqIEFuIGluc3RhbmNlIG9mIHNwZWNRdWVyeU1vZGVsR3JvdXAgKi9cbiAgICAgICAgZW5hYmxlUGlsbHNQcmV2aWV3OiAnPCcsXG4gICAgICAgIGluaXRpYWxMaW1pdDogJzwnLFxuICAgICAgICBsaXN0VGl0bGU6ICc8JyxcbiAgICAgICAgaGlkZUxpc3RUaXRsZTogJzwnLFxuICAgICAgICBjaGFydHM6ICc8JyxcbiAgICAgICAgcHJpb3JpdHk6ICc8JyxcbiAgICAgICAgc2hvd01vcmU6ICc8JyxcbiAgICAgICAgcG9zdFNlbGVjdEFjdGlvbjogJyYnXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUgLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuY29uc3RzID0gY29uc3RzO1xuICAgICAgICBzY29wZS5saW1pdCA9IHNjb3BlLmluaXRpYWxMaW1pdCB8fCAzO1xuXG4gICAgICAgIC8vIEZ1bmN0aW9uc1xuICAgICAgICBzY29wZS5nZXRDaGFydCA9IENoYXJ0LmdldENoYXJ0O1xuICAgICAgICBzY29wZS5pbmNyZWFzZUxpbWl0ID0gaW5jcmVhc2VMaW1pdDtcbiAgICAgICAgc2NvcGUuaXNJbmxpc3QgPSBpc0luTGlzdDtcbiAgICAgICAgc2NvcGUuc2VsZWN0ID0gc2VsZWN0O1xuICAgICAgICBzY29wZS5QaWxscyA9IFBpbGxzO1xuXG4gICAgICAgIC8vIGVsZW1lbnQuYmluZCgnc2Nyb2xsJywgZnVuY3Rpb24oKXtcbiAgICAgICAgLy8gICAgaWYoalF1ZXJ5KHRoaXMpLnNjcm9sbFRvcCgpICsgalF1ZXJ5KHRoaXMpLmlubmVySGVpZ2h0KCkgPj0galF1ZXJ5KHRoaXMpWzBdLnNjcm9sbEhlaWdodCl7XG4gICAgICAgIC8vICAgICBpZiAoc2NvcGUubGltaXQgPCBzY29wZS5tb2RlbEdyb3VwLmNoYXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgLy8gICAgICAgc2NvcGUuaW5jcmVhc2VMaW1pdCgpO1xuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyAgICB9XG4gICAgICAgIC8vIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIGluY3JlYXNlTGltaXQoKSB7XG4gICAgICAgICAgc2NvcGUubGltaXQgKz0gNTtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuTE9BRF9NT1JFLCBzY29wZS5saW1pdCwge1xuICAgICAgICAgICAgbGlzdDogc2NvcGUubGlzdFRpdGxlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvKiogcmV0dXJuIGlmIHRoZSBwbG90IGlzIHN0aWxsIGluIHRoZSB2aWV3LCBzbyBpdCBtaWdodCBiZSBvbWl0dGVkIGZyb20gdGhlIHJlbmRlciBxdWV1ZSBpZiBuZWNlc3NhcnkuICovXG4gICAgICAgIGZ1bmN0aW9uIGlzSW5MaXN0KGNoYXJ0KSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzY29wZS5jaGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmKGNoYXJ0LnNob3J0aGFuZCA9PT0gc2NvcGUuY2hhcnRzW2ldLnNob3J0aGFuZCkge1xuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2VsZWN0KGNoYXJ0KSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLlNQRUNfU0VMRUNULCBjaGFydC5zaG9ydGhhbmQsIHtcbiAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIFBpbGxzLnBhcnNlKGNoYXJ0LnZsU3BlYyk7XG4gICAgICAgICAgaWYgKHNjb3BlLnBvc3RTZWxlY3RBY3Rpb24pIHtcbiAgICAgICAgICAgIHNjb3BlLnBvc3RTZWxlY3RBY3Rpb24oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCdjb21wYWN0SlNPTicsIGZ1bmN0aW9uKEpTT04zKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICByZXR1cm4gSlNPTjMuc3RyaW5naWZ5KGlucHV0LCBudWxsLCAnICAnLCA4MCk7XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGZpbHRlclxuICogQG5hbWUgdmVnYS1saXRlLXVpLmZpbHRlcjplbmNvZGVVcmlcbiAqIEBmdW5jdGlvblxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGVuY29kZVVyaVxuICogRmlsdGVyIGluIHRoZSB2ZWdhLWxpdGUtdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcignZW5jb2RlVVJJJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgIHJldHVybiB3aW5kb3cuZW5jb2RlVVJJKGlucHV0KTtcbiAgICB9O1xuICB9KTsiLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGZpbHRlclxuICogQG5hbWUgZmFjZXRlZHZpei5maWx0ZXI6cmVwb3J0VXJsXG4gKiBAZnVuY3Rpb25cbiAqIEBkZXNjcmlwdGlvblxuICogIyByZXBvcnRVcmxcbiAqIEZpbHRlciBpbiB0aGUgZmFjZXRlZHZpei5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCdyZXBvcnRVcmwnLCBmdW5jdGlvbiAoY29tcGFjdEpTT05GaWx0ZXIsIF8sIGNvbnN0cykge1xuICAgIGZ1bmN0aW9uIHZveWFnZXJSZXBvcnQocGFyYW1zKSB7XG4gICAgICB2YXIgdXJsID0gJ2h0dHBzOi8vZG9jcy5nb29nbGUuY29tL2Zvcm1zL2QvMVQ5WkExNEYzbW16ckhSN0pKVlVLeVBYenJNcUY1NENqTElPanYyRTdaRU0vdmlld2Zvcm0/JztcblxuICAgICAgaWYgKHBhcmFtcy5maWVsZHMpIHtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gZW5jb2RlVVJJKGNvbXBhY3RKU09ORmlsdGVyKF8udmFsdWVzKHBhcmFtcy5maWVsZHMpKSk7XG4gICAgICAgIHVybCArPSAnZW50cnkuMTI0NTE5OTQ3Nz0nICsgcXVlcnkgKyAnJic7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXJhbXMuc3BlYykge1xuICAgICAgICB2YXIgc3BlYyA9IF8ub21pdChwYXJhbXMuc3BlYywgJ2NvbmZpZycpO1xuICAgICAgICBzcGVjID0gZW5jb2RlVVJJKGNvbXBhY3RKU09ORmlsdGVyKHNwZWMpKTtcbiAgICAgICAgdXJsICs9ICdlbnRyeS4xMzIzNjgwMTM2PScgKyBzcGVjICsgJyYnO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLnNwZWMyKSB7XG4gICAgICAgIHZhciBzcGVjMiA9IF8ub21pdChwYXJhbXMuc3BlYzIsICdjb25maWcnKTtcbiAgICAgICAgc3BlYzIgPSBlbmNvZGVVUkkoY29tcGFjdEpTT05GaWx0ZXIoc3BlYzIpKTtcbiAgICAgICAgdXJsICs9ICdlbnRyeS44NTMxMzc3ODY9JyArIHNwZWMyICsgJyYnO1xuICAgICAgfVxuXG4gICAgICB2YXIgdHlwZVByb3AgPSAnZW50cnkuMTk0MDI5MjY3Nz0nO1xuICAgICAgc3dpdGNoIChwYXJhbXMudHlwZSkge1xuICAgICAgICBjYXNlICd2bCc6XG4gICAgICAgICAgdXJsICs9IHR5cGVQcm9wICsgJ1Zpc3VhbGl6YXRpb24rUmVuZGVyaW5nKyhWZWdhbGl0ZSkmJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAndnInOlxuICAgICAgICAgIHVybCArPSB0eXBlUHJvcCArICdSZWNvbW1lbmRlcitBbGdvcml0aG0rKFZpc3JlYykmJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZnYnOlxuICAgICAgICAgIHVybCArPSB0eXBlUHJvcCArICdSZWNvbW1lbmRlcitVSSsoRmFjZXRlZFZpeikmJztcbiAgICAgICAgICBicmVhaztcblxuICAgICAgfVxuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB2bHVpUmVwb3J0KHBhcmFtcykge1xuICAgICAgdmFyIHVybCA9ICdodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9mb3Jtcy9kLzF4S3MtcUdhTFpFVWZiVG1oZG1Tb1MxM09LT0VwdXVfTk5XRTVUQUFtbF9ZL3ZpZXdmb3JtPyc7XG4gICAgICBpZiAocGFyYW1zLnNwZWMpIHtcbiAgICAgICAgdmFyIHNwZWMgPSBfLm9taXQocGFyYW1zLnNwZWMsICdjb25maWcnKTtcbiAgICAgICAgc3BlYyA9IGVuY29kZVVSSShjb21wYWN0SlNPTkZpbHRlcihzcGVjKSk7XG4gICAgICAgIHVybCArPSAnZW50cnkuMTI0NTE5OTQ3Nz0nICsgc3BlYyArICcmJztcbiAgICAgIH1cbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbnN0cy5hcHBJZCA9PT0gJ3ZveWFnZXInID8gdm95YWdlclJlcG9ydCA6IHZsdWlSZXBvcnQ7XG4gIH0pOyIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZmlsdGVyOnVuZGVyc2NvcmUyc3BhY2VcbiAqIEBmdW5jdGlvblxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHVuZGVyc2NvcmUyc3BhY2VcbiAqIEZpbHRlciBpbiB0aGUgdmVnYS1saXRlLXVpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ3VuZGVyc2NvcmUyc3BhY2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgcmV0dXJuIGlucHV0ID8gaW5wdXQucmVwbGFjZSgvXysvZywgJyAnKSA6ICcnO1xuICAgIH07XG4gIH0pOyIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuc2VydmljZSgnQWxlcnRzJywgZnVuY3Rpb24oJHRpbWVvdXQsIF8pIHtcbiAgICB2YXIgQWxlcnRzID0ge307XG5cbiAgICBBbGVydHMuYWxlcnRzID0gW107XG5cbiAgICBBbGVydHMuYWRkID0gZnVuY3Rpb24obXNnLCBkaXNtaXNzKSB7XG4gICAgICB2YXIgbWVzc2FnZSA9IHttc2c6IG1zZ307XG4gICAgICBBbGVydHMuYWxlcnRzLnB1c2gobWVzc2FnZSk7XG4gICAgICBpZiAoZGlzbWlzcykge1xuICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgaW5kZXggPSBfLmZpbmRJbmRleChBbGVydHMuYWxlcnRzLCBtZXNzYWdlKTtcbiAgICAgICAgICBBbGVydHMuY2xvc2VBbGVydChpbmRleCk7XG4gICAgICAgIH0sIGRpc21pc3MpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBBbGVydHMuY2xvc2VBbGVydCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICBBbGVydHMuYWxlcnRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfTtcblxuICAgIHJldHVybiBBbGVydHM7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBzZXJ2aWNlXG4gKiBAbmFtZSB2bHVpLkJvb2ttYXJrc1xuICogQGRlc2NyaXB0aW9uXG4gKiAjIEJvb2ttYXJrc1xuICogU2VydmljZSBpbiB0aGUgdmx1aS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuc2VydmljZSgnQm9va21hcmtzJywgZnVuY3Rpb24oXywgdmwsIGxvY2FsU3RvcmFnZVNlcnZpY2UsIExvZ2dlciwgRGF0YXNldCkge1xuICAgIHZhciBCb29rbWFya3MgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMubGlzdCA9IFtdO1xuICAgICAgdGhpcy5kaWN0ID0ge307XG4gICAgICB0aGlzLmlzU3VwcG9ydGVkID0gbG9jYWxTdG9yYWdlU2VydmljZS5pc1N1cHBvcnRlZDtcbiAgICB9O1xuXG4gICAgdmFyIHByb3RvID0gQm9va21hcmtzLnByb3RvdHlwZTtcblxuICAgIHByb3RvLnNhdmUgPSBmdW5jdGlvbigpIHtcbiAgICAgIGxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0KCdib29rbWFya0xpc3QnLCB0aGlzLmxpc3QpO1xuICAgIH07XG5cbiAgICBwcm90by5zYXZlQW5ub3RhdGlvbnMgPSBmdW5jdGlvbihzaG9ydGhhbmQpIHtcbiAgICAgIF8uZmluZCh0aGlzLmxpc3QsIGZ1bmN0aW9uKGJvb2ttYXJrKSB7IHJldHVybiBib29rbWFyay5zaG9ydGhhbmQgPT09IHNob3J0aGFuZDsgfSlcbiAgICAgICAgLmNoYXJ0LmFubm90YXRpb24gPSB0aGlzLmRpY3Rbc2hvcnRoYW5kXS5hbm5vdGF0aW9uO1xuICAgICAgdGhpcy5zYXZlKCk7XG4gICAgfTtcblxuICAgIC8vIGV4cG9ydCBhbGwgYm9va21hcmtzIGFuZCBhbm5vdGF0aW9uc1xuICAgIHByb3RvLmV4cG9ydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGRpY3Rpb25hcnkgPSB0aGlzLmRpY3Q7XG5cbiAgICAgIC8vIHByZXBhcmUgZXhwb3J0IGRhdGFcbiAgICAgIHZhciBleHBvcnRTcGVjcyA9IFtdO1xuICAgICAgXy5mb3JFYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24oYm9va21hcmspIHtcbiAgICAgICAgdmFyIHNwZWMgPSBib29rbWFyay5jaGFydC52bFNwZWM7XG4gICAgICAgIHNwZWMuZGVzY3JpcHRpb24gPSBkaWN0aW9uYXJ5W2Jvb2ttYXJrLnNob3J0aGFuZF0uYW5ub3RhdGlvbjtcbiAgICAgICAgZXhwb3J0U3BlY3MucHVzaChzcGVjKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyB3cml0ZSBleHBvcnQgZGF0YSBpbiBhIG5ldyB0YWJcbiAgICAgIHZhciBleHBvcnRXaW5kb3cgPSB3aW5kb3cub3BlbigpO1xuICAgICAgZXhwb3J0V2luZG93LmRvY3VtZW50Lm9wZW4oKTtcbiAgICAgIGV4cG9ydFdpbmRvdy5kb2N1bWVudC53cml0ZSgnPGh0bWw+PGJvZHk+PHByZT4nICsgSlNPTi5zdHJpbmdpZnkoZXhwb3J0U3BlY3MsIG51bGwsIDIpICsgJzwvcHJlPjwvYm9keT48L2h0bWw+Jyk7XG4gICAgICBleHBvcnRXaW5kb3cuZG9jdW1lbnQuY2xvc2UoKTtcbiAgICB9O1xuXG4gICAgcHJvdG8ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5saXN0ID0gbG9jYWxTdG9yYWdlU2VydmljZS5nZXQoJ2Jvb2ttYXJrTGlzdCcpIHx8IFtdO1xuXG4gICAgICAvLyBwb3B1bGF0ZSB0aGlzLmRpY3RcbiAgICAgIHZhciBkaWN0aW9uYXJ5ID0gdGhpcy5kaWN0O1xuICAgICAgXy5mb3JFYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24oYm9va21hcmspIHtcbiAgICAgICAgZGljdGlvbmFyeVtib29rbWFyay5zaG9ydGhhbmRdID0gXy5jbG9uZURlZXAoYm9va21hcmsuY2hhcnQpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHByb3RvLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmxpc3Quc3BsaWNlKDAsIHRoaXMubGlzdC5sZW5ndGgpO1xuICAgICAgdGhpcy5kaWN0ID0ge307XG4gICAgICB0aGlzLnNhdmUoKTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX0NMRUFSKTtcbiAgICB9O1xuXG4gICAgcHJvdG8uYWRkID0gZnVuY3Rpb24oY2hhcnQsIGxpc3RUaXRsZSkge1xuICAgICAgdmFyIHNob3J0aGFuZCA9IGNoYXJ0LnNob3J0aGFuZDtcbiAgICAgIGNoYXJ0LnRpbWVBZGRlZCA9IChuZXcgRGF0ZSgpLmdldFRpbWUoKSk7XG5cbiAgICAgIC8vIEZJWE1FOiB0aGlzIGlzIG5vdCBhbHdheXMgYSBnb29kIGlkZWFcbiAgICAgIGNoYXJ0LnNjaGVtYSA9IERhdGFzZXQuc2NoZW1hO1xuXG4gICAgICB0aGlzLmRpY3RbY2hhcnQuc2hvcnRoYW5kXSA9IF8uY2xvbmVEZWVwKGNoYXJ0KTtcblxuICAgICAgdGhpcy5saXN0LnB1c2goe1xuICAgICAgICBzaG9ydGhhbmQ6IHNob3J0aGFuZCxcbiAgICAgICAgbGlzdDogbGlzdFRpdGxlLFxuICAgICAgICBjaGFydDogXy5jbG9uZURlZXAoY2hhcnQpXG4gICAgICB9KTtcblxuICAgICAgdGhpcy5zYXZlKCk7XG5cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19BREQsIHNob3J0aGFuZCwge1xuICAgICAgICBsaXN0OiBsaXN0VGl0bGVcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBwcm90by5yZW1vdmUgPSBmdW5jdGlvbihjaGFydCkge1xuICAgICAgdmFyIHNob3J0aGFuZCA9IGNoYXJ0LnNob3J0aGFuZDtcblxuICAgICAgLy8gcmVtb3ZlIGJvb2ttYXJrIGZyb20gdGhpcy5saXN0XG4gICAgICB2YXIgaW5kZXggPSB0aGlzLmxpc3QuZmluZEluZGV4KGZ1bmN0aW9uKGJvb2ttYXJrKSB7IHJldHVybiBib29rbWFyay5zaG9ydGhhbmQgPT09IHNob3J0aGFuZDsgfSk7XG4gICAgICB2YXIgcmVtb3ZlZDtcbiAgICAgIGlmIChpbmRleCA+PSAwKSB7XG4gICAgICAgIHJlbW92ZWQgPSB0aGlzLmxpc3Quc3BsaWNlKGluZGV4LCAxKVswXTtcbiAgICAgIH1cblxuICAgICAgLy8gcmVtb3ZlIGJvb2ttYXJrIGZyb20gdGhpcy5kaWN0XG4gICAgICBkZWxldGUgdGhpcy5kaWN0W2NoYXJ0LnNob3J0aGFuZF07XG5cbiAgICAgIHRoaXMuc2F2ZSgpO1xuXG4gICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfUkVNT1ZFLCBzaG9ydGhhbmQsIHtcbiAgICAgICAgbGlzdDogKHJlbW92ZWQgfHwge30pLmxpc3RcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBwcm90by5yZW9yZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnNhdmUoKTtcbiAgICB9O1xuXG4gICAgcHJvdG8uaXNCb29rbWFya2VkID0gZnVuY3Rpb24oc2hvcnRoYW5kKSB7XG4gICAgICByZXR1cm4gdGhpcy5kaWN0Lmhhc093blByb3BlcnR5KHNob3J0aGFuZCk7XG4gICAgfTtcblxuICAgIHByb3RvLmxvZ0Jvb2ttYXJrc0Nsb3NlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX0NMT1NFKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5ldyBCb29rbWFya3MoKTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ0NoYXJ0JywgZnVuY3Rpb24gKGNxbCwgXykge1xuICAgIHZhciBDaGFydCA9IHtcbiAgICAgIGdldENoYXJ0OiBnZXRDaGFydCxcbiAgICAgIHRyYW5zcG9zZTogdHJhbnNwb3NlXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTcGVjUXVlcnlNb2RlbEdyb3VwIHwgU3BlY1F1ZXJ5TW9kZWx9IGl0ZW1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRDaGFydChpdGVtKSB7XG4gICAgICBpZiAoIWl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAvKiogQHR5cGUge09iamVjdH0gY29uY2lzZSBzcGVjIGdlbmVyYXRlZCAqL1xuICAgICAgICAgIHZsU3BlYzogbnVsbCxcbiAgICAgICAgICBmaWVsZFNldDogbnVsbCxcblxuICAgICAgICAgIC8qKiBAdHlwZSB7U3RyaW5nfSBnZW5lcmF0ZWQgdmwgc2hvcnRoYW5kICovXG4gICAgICAgICAgc2hvcnRoYW5kOiBudWxsLFxuICAgICAgICAgIGVudW1TcGVjSW5kZXg6IG51bGxcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgdmFyIHNwZWNNID0gaXRlbSBpbnN0YW5jZW9mIGNxbC5tb2RlbC5TcGVjUXVlcnlNb2RlbEdyb3VwID9cbiAgICAgICAgaXRlbS5nZXRUb3BTcGVjUXVlcnlNb2RlbCgpOlxuICAgICAgICBpdGVtO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZW51bVNwZWNJbmRleDogc3BlY00uZW51bVNwZWNJbmRleCxcbiAgICAgICAgZmllbGRTZXQ6IHNwZWNNLnNwZWNRdWVyeS5lbmNvZGluZ3MsXG4gICAgICAgIHZsU3BlYzogc3BlY00udG9TcGVjKCksXG4gICAgICAgIHNob3J0aGFuZDogc3BlY00udG9TaG9ydGhhbmQoKVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmFuc3Bvc2Uoc3BlYykge1xuICAgICAgdmFyIGVuY29kaW5nID0gXy5jbG9uZShzcGVjLmVuY29kaW5nKTtcbiAgICAgIHZhciBvbGRYRW5jID0gZW5jb2RpbmcueDtcbiAgICAgIHZhciBvbGRZRW5jID0gZW5jb2RpbmcueTtcbiAgICAgIGVuY29kaW5nLnkgPSBvbGRYRW5jO1xuICAgICAgZW5jb2RpbmcueCA9IG9sZFlFbmM7XG5cbiAgICAgIHZhciBvbGRSb3dFbmMgPSBlbmNvZGluZy5yb3c7XG4gICAgICB2YXIgb2xkQ29sRW5jID0gZW5jb2RpbmcuY29sdW1uO1xuICAgICAgZW5jb2Rpbmcucm93ID0gb2xkQ29sRW5jO1xuICAgICAgZW5jb2RpbmcuY29sdW1uID0gb2xkUm93RW5jO1xuXG4gICAgICBzcGVjLmVuY29kaW5nID0gZW5jb2Rpbmc7XG4gICAgfVxuXG4gICAgcmV0dXJuIENoYXJ0O1xuICB9KTsiLCIndXNlIHN0cmljdCc7XG5cbi8vIFNlcnZpY2UgZm9yIHRoZSBzcGVjIGNvbmZpZy5cbi8vIFdlIGtlZXAgdGhpcyBzZXBhcmF0ZSBzbyB0aGF0IGNoYW5nZXMgYXJlIGtlcHQgZXZlbiBpZiB0aGUgc3BlYyBjaGFuZ2VzLlxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmFjdG9yeSgnQ29uZmlnJywgZnVuY3Rpb24oKSB7XG4gICAgdmFyIENvbmZpZyA9IHt9O1xuXG4gICAgQ29uZmlnLmRhdGEgPSB7fTtcbiAgICBDb25maWcuY29uZmlnID0ge307XG5cbiAgICBDb25maWcuZ2V0Q29uZmlnID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfTtcblxuICAgIENvbmZpZy5nZXREYXRhID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gQ29uZmlnLmRhdGE7XG4gICAgfTtcblxuICAgIENvbmZpZy5sYXJnZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY2VsbDoge1xuICAgICAgICAgIHdpZHRoOiA0MDAsXG4gICAgICAgICAgaGVpZ2h0OiA0MDBcbiAgICAgICAgfSxcbiAgICAgICAgZmFjZXQ6IHtcbiAgICAgICAgICBjZWxsOiB7XG4gICAgICAgICAgICB3aWR0aDogMjAwLFxuICAgICAgICAgICAgaGVpZ2h0OiAyMDBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfTtcblxuICAgIENvbmZpZy5zbWFsbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZmFjZXQ6IHtcbiAgICAgICAgICBjZWxsOiB7XG4gICAgICAgICAgICB3aWR0aDogMTUwLFxuICAgICAgICAgICAgaGVpZ2h0OiAxNTBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfTtcblxuICAgIENvbmZpZy51cGRhdGVEYXRhc2V0ID0gZnVuY3Rpb24oZGF0YXNldCwgdHlwZSkge1xuICAgICAgaWYgKGRhdGFzZXQudmFsdWVzKSB7XG4gICAgICAgIENvbmZpZy5kYXRhLnZhbHVlcyA9IGRhdGFzZXQudmFsdWVzO1xuICAgICAgICBkZWxldGUgQ29uZmlnLmRhdGEudXJsO1xuICAgICAgICBDb25maWcuZGF0YS5mb3JtYXRUeXBlID0gdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgQ29uZmlnLmRhdGEudXJsID0gZGF0YXNldC51cmw7XG4gICAgICAgIGRlbGV0ZSBDb25maWcuZGF0YS52YWx1ZXM7XG4gICAgICAgIENvbmZpZy5kYXRhLmZvcm1hdFR5cGUgPSB0eXBlO1xuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gQ29uZmlnO1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2Mgc2VydmljZVxuICogQG5hbWUgdmVnYS1saXRlLXVpLmxvZ2dlclxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGxvZ2dlclxuICogU2VydmljZSBpbiB0aGUgdmVnYS1saXRlLXVpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdMb2dnZXInLCBmdW5jdGlvbiAoJGxvY2F0aW9uLCAkd2luZG93LCAkd2ViU3FsLCBfLCBjb25zdHMsIEFuYWx5dGljcywgUGFwYSwgQmxvYiwgVVJMKSB7XG5cbiAgICB2YXIgc2VydmljZSA9IHt9O1xuXG4gICAgc2VydmljZS5sZXZlbHMgPSB7XG4gICAgICBPRkY6IHtpZDonT0ZGJywgcmFuazowfSxcbiAgICAgIFRSQUNFOiB7aWQ6J1RSQUNFJywgcmFuazoxfSxcbiAgICAgIERFQlVHOiB7aWQ6J0RFQlVHJywgcmFuazoyfSxcbiAgICAgIElORk86IHtpZDonSU5GTycsIHJhbms6M30sXG4gICAgICBXQVJOOiB7aWQ6J1dBUk4nLCByYW5rOjR9LFxuICAgICAgRVJST1I6IHtpZDonRVJST1InLCByYW5rOjV9LFxuICAgICAgRkFUQUw6IHtpZDonRkFUQUwnLCByYW5rOjZ9XG4gICAgfTtcblxuICAgIHNlcnZpY2UuYWN0aW9ucyA9IHtcbiAgICAgIC8vIERBVEFcbiAgICAgIElOSVRJQUxJWkU6IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0lOSVRJQUxJWkUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgVU5ETzoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnVU5ETycsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFJFRE86IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ1JFRE8nLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEQVRBU0VUX0NIQU5HRToge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEQVRBU0VUX09QRU46IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0RBVEFTRVRfT1BFTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfTkVXX1BBU1RFOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdEQVRBU0VUX05FV19QQVNURScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfTkVXX1VSTDoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9ORVdfVVJMJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgLy8gQk9PS01BUktcbiAgICAgIEJPT0tNQVJLX0FERDoge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDonQk9PS01BUktfQUREJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfUkVNT1ZFOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19SRU1PVkUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19PUEVOOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19PUEVOJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfQ0xPU0U6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6J0JPT0tNQVJLX0NMT1NFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfQ0xFQVI6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6ICdCT09LTUFSS19DTEVBUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIC8vIENIQVJUXG4gICAgICBDSEFSVF9NT1VTRU9WRVI6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX01PVVNFT1ZFUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9NT1VTRU9VVDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfTU9VU0VPVVQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfUkVOREVSOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9SRU5ERVInLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfRVhQT1NFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9FWFBPU0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfVE9PTFRJUDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfVE9PTFRJUCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9UT09MVElQX0VORDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfVE9PTFRJUF9FTkQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuXG4gICAgICBTT1JUX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonU09SVF9UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBNQVJLX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTUFSS19UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEUklMTF9ET1dOX09QRU46IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0RSSUxMX0RPV05fT1BFTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERSSUxMX0RPV05fQ0xPU0U6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6ICdEUklMTF9ET1dOX0NMT1NFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgTE9HX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDogJ0xPR19UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBUUkFOU1BPU0VfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOiAnVFJBTlNQT1NFX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIE5VTExfRklMVEVSX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTlVMTF9GSUxURVJfVE9HR0xFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICBDTFVTVEVSX1NFTEVDVDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0xVU1RFUl9TRUxFQ1QnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBMT0FEX01PUkU6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0xPQURfTU9SRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcblxuICAgICAgLy8gRklFTERTXG4gICAgICBGSUVMRFNfQ0hBTkdFOiB7Y2F0ZWdvcnk6ICdGSUVMRFMnLCBpZDogJ0ZJRUxEU19DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBGSUVMRFNfUkVTRVQ6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnRklFTERTX1JFU0VUJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRlVOQ19DSEFOR0U6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnRlVOQ19DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBBRERfRklFTEQ6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnQUREX0ZJRUxEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvLyBGaWVsZCBJbmZvXG4gICAgICBGSUVMRERFRl9ISUdITElHSFRFRDoge2NhdGVnb3J5OiAnRklFTERJTkZPJywgaWQ6ICdGSUVMRERFRl9ISUdITElHSFRFRCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEZJRUxEREVGX1VOSElHSExJR0hURUQ6IHtjYXRlZ29yeTogJ0ZJRUxESU5GTycsIGlkOiAnRklFTERERUZfVU5ISUdITElHSFRFRCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcblxuICAgICAgLy9QT0xFU1RBUlxuICAgICAgU1BFQ19DTEVBTjoge2NhdGVnb3J5OidQT0xFU1RBUicsIGlkOiAnU1BFQ19DTEVBTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFNQRUNfQ0hBTkdFOiB7Y2F0ZWdvcnk6J1BPTEVTVEFSJywgaWQ6ICdTUEVDX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEZJRUxEX0RST1A6IHtjYXRlZ29yeTogJ1BPTEVTVEFSJywgaWQ6ICdGSUVMRF9EUk9QJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgTUFSS19DSEFOR0U6IHtjYXRlZ29yeTogJ1BPTEVTVEFSJywgaWQ6ICdNQVJLX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcblxuICAgICAgLy8gVm95YWdlciAyXG4gICAgICBTUEVDX1NFTEVDVDoge2NhdGVnb3J5OidWT1lBR0VSMicsIGlkOiAnU1BFQ19TRUxFQ1QnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG5cbiAgICAgIC8vIEFsdGVybmF0aXZlc1xuICAgICAgU0VUX0FMVEVSTkFUSVZFU19UWVBFOiB7Y2F0ZWdvcnk6J0FMVEVSTkFUSVZFUycsIGlkOiAnU0VUX0FMVEVSTkFUSVZFU19UWVBFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgVE9HR0xFX1NIT1dfQUxURVJOQVRJVkVTOiB7Y2F0ZWdvcnk6J0FMVEVSTkFUSVZFUycsIGlkOiAnVE9HR0xFX1NIT1dfQUxURVJOQVRJVkVTJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgVE9HR0xFX0hJREVfQUxURVJOQVRJVkVTOiB7Y2F0ZWdvcnk6J0FMVEVSTkFUSVZFUycsIGlkOiAnVE9HR0xFX0hJREVfQUxURVJOQVRJVkVTJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvLyBQcmV2aWV3XG4gICAgICBTUEVDX1BSRVZJRVdfRU5BQkxFRDoge2NhdGVnb3J5OidQUkVWSUVXJywgaWQ6ICdTUEVDX1BSRVZJRVdfRU5BQkxFRCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFNQRUNfUFJFVklFV19ESVNBQkxFRDoge2NhdGVnb3J5OidQUkVWSUVXJywgaWQ6ICdTUEVDX1BSRVZJRVdfRElTQUJMRUQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT31cbiAgICB9O1xuXG4gICAgLy8gY3JlYXRlIG5vb3Agc2VydmljZSBpZiB3ZWJzcWwgaXMgbm90IHN1cHBvcnRlZFxuICAgIGlmICgkd2luZG93Lm9wZW5EYXRhYmFzZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ05vIHdlYnNxbCBzdXBwb3J0IGFuZCB0aHVzIG5vIGxvZ2dpbmcuJyk7XG4gICAgICBzZXJ2aWNlLmxvZ0ludGVyYWN0aW9uID0gZnVuY3Rpb24oKSB7fTtcbiAgICAgIHJldHVybiBzZXJ2aWNlO1xuICAgIH1cblxuICAgIC8vIGdldCB1c2VyIGlkIG9uY2UgaW4gdGhlIGJlZ2lubmluZ1xuICAgIHZhciB1c2VyaWQgPSBzZXJ2aWNlLnVzZXJpZCA9ICRsb2NhdGlvbi5zZWFyY2goKS51c2VyaWQ7XG5cbiAgICBzZXJ2aWNlLmRiID0gJHdlYlNxbC5vcGVuRGF0YWJhc2UoJ2xvZ3MnLCAnMS4wJywgJ0xvZ3MnLCAyICogMTAyNCAqIDEwMjQpO1xuXG4gICAgc2VydmljZS50YWJsZU5hbWUgPSAnTG9nc18nICsgY29uc3RzLmFwcElkO1xuXG4gICAgLy8gKHplbmluZykgVE9ETzogY2hlY2sgaWYgdGhlIHRhYmxlIGlzIGNvcnJlY3QsIGRvIHdlIHJlYWxseSBuZWVkIHRpbWU/IHdpbGwgdGltZSBiZSBhdXRvbWF0aWNhbGx5IGFkZGVkP1xuICAgIHNlcnZpY2UuY3JlYXRlVGFibGVJZk5vdEV4aXN0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgc2VydmljZS5kYi5jcmVhdGVUYWJsZShzZXJ2aWNlLnRhYmxlTmFtZSwge1xuICAgICAgICAndXNlcmlkJzoge1xuICAgICAgICAgICd0eXBlJzogJ0lOVEVHRVInLFxuICAgICAgICAgICdudWxsJzogJ05PVCBOVUxMJ1xuICAgICAgICB9LFxuICAgICAgICAndGltZSc6IHtcbiAgICAgICAgICAndHlwZSc6ICdUSU1FU1RBTVAnLFxuICAgICAgICAgICdudWxsJzogJ05PVCBOVUxMJ1xuICAgICAgICB9LFxuICAgICAgICAnYWN0aW9uQ2F0ZWdvcnknOiB7XG4gICAgICAgICAgJ3R5cGUnOiAnVEVYVCcsXG4gICAgICAgICAgJ251bGwnOiAnTk9UIE5VTEwnXG4gICAgICAgIH0sXG4gICAgICAgICdhY3Rpb25JZCc6IHtcbiAgICAgICAgICAndHlwZSc6ICdURVhUJyxcbiAgICAgICAgICAnbnVsbCc6ICdOT1QgTlVMTCdcbiAgICAgICAgfSxcbiAgICAgICAgJ2xhYmVsJzoge1xuICAgICAgICAgICd0eXBlJzogJ1RFWFQnLFxuICAgICAgICAgICdudWxsJzogJ05PVCBOVUxMJ1xuICAgICAgICB9LFxuICAgICAgICAnZGF0YSc6IHtcbiAgICAgICAgICAndHlwZSc6ICdURVhUJ1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgc2VydmljZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHIgPSAkd2luZG93LmNvbmZpcm0oJ1JlYWxseSBjbGVhciB0aGUgbG9ncz8nKTtcbiAgICAgIGlmIChyID09PSB0cnVlKSB7XG4gICAgICAgIHNlcnZpY2UuZGIuZHJvcFRhYmxlKHNlcnZpY2UudGFibGVOYW1lKTtcbiAgICAgICAgc2VydmljZS5jcmVhdGVUYWJsZUlmTm90RXhpc3RzKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHNlcnZpY2UuZXhwb3J0ID0gZnVuY3Rpb24oKSB7XG4gICAgICBzZXJ2aWNlLmRiLnNlbGVjdEFsbChzZXJ2aWNlLnRhYmxlTmFtZSkudGhlbihmdW5jdGlvbihyZXN1bHRzKSB7XG4gICAgICAgIGlmIChyZXN1bHRzLnJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKCdObyBsb2dzJyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJvd3MgPSBbXTtcblxuICAgICAgICBmb3IodmFyIGk9MDsgaSA8IHJlc3VsdHMucm93cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHJvd3MucHVzaChyZXN1bHRzLnJvd3MuaXRlbShpKSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY3N2ID0gUGFwYS51bnBhcnNlKHJvd3MpO1xuXG4gICAgICAgIHZhciBjc3ZEYXRhID0gbmV3IEJsb2IoW2Nzdl0sIHsgdHlwZTogJ3RleHQvY3N2JyB9KTtcbiAgICAgICAgdmFyIGNzdlVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoY3N2RGF0YSk7XG5cbiAgICAgICAgdmFyIGVsZW1lbnQgPSBhbmd1bGFyLmVsZW1lbnQoJzxhLz4nKTtcbiAgICAgICAgZWxlbWVudC5hdHRyKHtcbiAgICAgICAgICBocmVmOiBjc3ZVcmwsXG4gICAgICAgICAgdGFyZ2V0OiAnX2JsYW5rJyxcbiAgICAgICAgICBkb3dubG9hZDogc2VydmljZS50YWJsZU5hbWUgKyAnXycgKyB1c2VyaWQgKyAnXycgKyBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkgKyAnLmNzdidcbiAgICAgICAgfSlbMF0uY2xpY2soKTtcbiAgICAgIH0pO1xuICAgIH07XG5cblxuICAgIHNlcnZpY2UubG9nSW50ZXJhY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24sIGxhYmVsLCBkYXRhKSB7XG4gICAgICBpZiAoIWNvbnN0cy5sb2dnaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciB2YWx1ZSA9IGRhdGEgPyBkYXRhLnZhbHVlIDogdW5kZWZpbmVkO1xuICAgICAgaWYoYWN0aW9uLmxldmVsLnJhbmsgPj0gc2VydmljZS5sZXZlbHNbY29uc3RzLmxvZ0xldmVsIHx8ICdJTkZPJ10ucmFuaykge1xuICAgICAgICBBbmFseXRpY3MudHJhY2tFdmVudChhY3Rpb24uY2F0ZWdvcnksIGFjdGlvbi5pZCwgbGFiZWwsIHZhbHVlKTtcblxuICAgICAgICBpZiAoY29uc3RzLmxvZ1RvV2ViU3FsKSB7XG4gICAgICAgICAgdmFyIHJvdyA9IHtcbiAgICAgICAgICAgIHVzZXJpZDogdXNlcmlkLFxuICAgICAgICAgICAgdGltZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgYWN0aW9uQ2F0ZWdvcnk6IGFjdGlvbi5jYXRlZ29yeSxcbiAgICAgICAgICAgIGFjdGlvbklkOiBhY3Rpb24uaWQsXG4gICAgICAgICAgICBsYWJlbDogXy5pc09iamVjdChsYWJlbCkgPyBKU09OLnN0cmluZ2lmeShsYWJlbCkgOiBsYWJlbCxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEgPyBKU09OLnN0cmluZ2lmeShkYXRhKSA6IHVuZGVmaW5lZFxuICAgICAgICAgIH07XG4gICAgICAgICAgc2VydmljZS5kYi5pbnNlcnQoc2VydmljZS50YWJsZU5hbWUsIHJvdyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYWN0aW9uLmxldmVsLnJhbmsgPj0gc2VydmljZS5sZXZlbHNbY29uc3RzLmxvZ1ByaW50TGV2ZWwgfHwgJ0lORk8nXS5yYW5rKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ1tMb2dnaW5nXSAnLCBhY3Rpb24uaWQsIGxhYmVsLCBkYXRhKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBzZXJ2aWNlLmNyZWF0ZVRhYmxlSWZOb3RFeGlzdHMoKTtcbiAgICBjb25zb2xlLmxvZygnYXBwOicsIGNvbnN0cy5hcHBJZCwgJ3N0YXJ0ZWQnKTtcbiAgICBzZXJ2aWNlLmxvZ0ludGVyYWN0aW9uKHNlcnZpY2UuYWN0aW9ucy5JTklUSUFMSVpFLCBjb25zdHMuYXBwSWQpO1xuXG4gICAgcmV0dXJuIHNlcnZpY2U7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdQaWxscycsIGZ1bmN0aW9uIChBTlksIHV0aWwpIHtcbiAgICB2YXIgUGlsbHMgPSB7XG4gICAgICAvLyBGdW5jdGlvbnNcbiAgICAgIGlzQW55Q2hhbm5lbDogaXNBbnlDaGFubmVsLFxuICAgICAgZ2V0TmV4dEFueUNoYW5uZWxJZDogZ2V0TmV4dEFueUNoYW5uZWxJZCxcbiAgICAgIGdldEVtcHR5QW55Q2hhbm5lbElkOiBnZXRFbXB0eUFueUNoYW5uZWxJZCxcbiAgICAgIGlzRW51bWVyYXRlZENoYW5uZWw6IGlzRW51bWVyYXRlZENoYW5uZWwsXG4gICAgICBpc0VudW1lcmF0ZWRGaWVsZDogaXNFbnVtZXJhdGVkRmllbGQsXG5cbiAgICAgIGdldDogZ2V0LFxuICAgICAgLy8gRXZlbnRcbiAgICAgIGRyYWdTdGFydDogZHJhZ1N0YXJ0LFxuICAgICAgZHJhZ1N0b3A6IGRyYWdTdG9wLFxuICAgICAgLy8gRXZlbnQsIHdpdGggaGFuZGxlciBpbiB0aGUgbGlzdGVuZXJcblxuICAgICAgLyoqIFNldCBhIGZpZWxkRGVmIGZvciBhIGNoYW5uZWwgKi9cbiAgICAgIHNldDogc2V0LFxuXG4gICAgICAvKiogUmVtb3ZlIGEgZmllbGREZWYgZnJvbSBhIGNoYW5uZWwgKi9cbiAgICAgIHJlbW92ZTogcmVtb3ZlLFxuXG4gICAgICAvKiogQWRkIG5ldyBmaWVsZCB0byB0aGUgcGlsbHMgKi9cbiAgICAgIGFkZDogYWRkLFxuXG4gICAgICAvKiogUGFzcyBtZXNzYWdlIHRvIHRvZ2dsZXIgbGlzdGVuZXJzICovXG4gICAgICByZXNjYWxlOiByZXNjYWxlLFxuICAgICAgc29ydDogc29ydCxcbiAgICAgIHRvZ2dsZUZpbHRlckludmFsaWQ6IHRvZ2dsZUZpbHRlckludmFsaWQsXG4gICAgICB0cmFuc3Bvc2U6IHRyYW5zcG9zZSxcblxuICAgICAgLyoqIFBhcnNlIGEgbmV3IHNwZWMgKi9cbiAgICAgIHBhcnNlOiBwYXJzZSxcblxuICAgICAgLyoqIFByZXZpZXcgYSBzcGVjICovXG4gICAgICBwcmV2aWV3OiBwcmV2aWV3LFxuXG4gICAgICAvKiogSWYgdGhlIHNwZWMvcXVlcnkgZ2V0cyB1cGRhdGVkICovXG4gICAgICB1cGRhdGU6IHVwZGF0ZSxcblxuICAgICAgcmVzZXQ6IHJlc2V0LFxuICAgICAgZHJhZ0Ryb3A6IGRyYWdEcm9wLFxuXG4gICAgICAvLyBEYXRhXG4gICAgICAvLyBUT0RPOiBzcGxpdCBiZXR3ZWVuIGVuY29kaW5nIHJlbGF0ZWQgYW5kIG5vbi1lbmNvZGluZyByZWxhdGVkXG4gICAgICBwaWxsczoge30sXG4gICAgICBoaWdobGlnaHRlZDoge30sXG4gICAgICAvKiogcGlsbCBiZWluZyBkcmFnZ2VkICovXG4gICAgICBkcmFnZ2luZzogbnVsbCxcbiAgICAgIC8qKiBjaGFubmVsSWQgdGhhdCdzIHRoZSBwaWxsIGlzIGJlaW5nIGRyYWdnZWQgZnJvbSAqL1xuICAgICAgY2lkRHJhZ0Zyb206IG51bGwsXG4gICAgICAvKiogTGlzdGVuZXIgICovXG4gICAgICBsaXN0ZW5lcjogbnVsbFxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIGNoYW5uZWwgaWQgaXMgYW4gXCJhbnlcIiBjaGFubmVsXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2FueX0gY2hhbm5lbElkXG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNBbnlDaGFubmVsKGNoYW5uZWxJZCkge1xuICAgICAgcmV0dXJuIGNoYW5uZWxJZCAmJiBjaGFubmVsSWQuaW5kZXhPZihBTlkpID09PSAwOyAvLyBwcmVmaXggYnkgQU5ZXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0RW1wdHlBbnlDaGFubmVsSWQoKSB7XG4gICAgICB2YXIgYW55Q2hhbm5lbHMgPSB1dGlsLmtleXMoUGlsbHMucGlsbHMpLmZpbHRlcihmdW5jdGlvbihjaGFubmVsSWQpIHtcbiAgICAgICAgcmV0dXJuIGNoYW5uZWxJZC5pbmRleE9mKEFOWSkgPT09IDA7XG4gICAgICB9KTtcbiAgICAgIGZvciAodmFyIGk9MCA7IGkgPCBhbnlDaGFubmVscy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2hhbm5lbElkID0gYW55Q2hhbm5lbHNbaV07XG4gICAgICAgIGlmICghUGlsbHMucGlsbHNbY2hhbm5lbElkXS5maWVsZCkge1xuICAgICAgICAgIHJldHVybiBjaGFubmVsSWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gZW1wdHkgYW55IGNoYW5uZWwgYXZhaWxhYmxlIScpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE5leHRBbnlDaGFubmVsSWQoKSB7XG4gICAgICB2YXIgaSA9IDA7XG4gICAgICB3aGlsZSAoUGlsbHMucGlsbHNbQU5ZICsgaV0pIHtcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIEFOWSArIGk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0IGEgZmllbGREZWYgb2YgYSBwaWxsIG9mIGEgZ2l2ZW4gY2hhbm5lbElkXG4gICAgICogQHBhcmFtIGNoYW5uZWxJZCBjaGFubmVsIGlkIG9mIHRoZSBwaWxsIHRvIGJlIHVwZGF0ZWRcbiAgICAgKiBAcGFyYW0gZmllbGREZWYgZmllbGREZWYgdG8gdG8gYmUgdXBkYXRlZFxuICAgICAqIEBwYXJhbSB1cGRhdGUgd2hldGhlciB0byBwcm9wYWdhdGUgY2hhbmdlIHRvIHRoZSBjaGFubmVsIHVwZGF0ZSBsaXN0ZW5lclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNldChjaGFubmVsSWQsIGZpZWxkRGVmLCB1cGRhdGUpIHtcbiAgICAgIFBpbGxzLnBpbGxzW2NoYW5uZWxJZF0gPSBmaWVsZERlZjtcblxuICAgICAgaWYgKHVwZGF0ZSAmJiBQaWxscy5saXN0ZW5lcikge1xuICAgICAgICBQaWxscy5saXN0ZW5lci5zZXQoY2hhbm5lbElkLCBmaWVsZERlZik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGEgZmllbGREZWYgb2YgYSBwaWxsIG9mIGEgZ2l2ZW4gY2hhbm5lbElkXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0KGNoYW5uZWxJZCkge1xuICAgICAgcmV0dXJuIFBpbGxzLnBpbGxzW2NoYW5uZWxJZF07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkKGZpZWxkRGVmKSB7XG4gICAgICBpZiAoUGlsbHMubGlzdGVuZXIgJiYgUGlsbHMubGlzdGVuZXIuYWRkKSB7XG4gICAgICAgIFBpbGxzLmxpc3RlbmVyLmFkZChmaWVsZERlZik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNFbnVtZXJhdGVkQ2hhbm5lbChjaGFubmVsSWQpIHtcbiAgICAgIGlmIChQaWxscy5saXN0ZW5lciAmJiBQaWxscy5saXN0ZW5lci5pc0VudW1lcmF0ZWRDaGFubmVsKSB7XG4gICAgICAgIHJldHVybiBQaWxscy5saXN0ZW5lci5pc0VudW1lcmF0ZWRDaGFubmVsKGNoYW5uZWxJZCwgUGlsbHMucGlsbHNbY2hhbm5lbElkXSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNFbnVtZXJhdGVkRmllbGQoY2hhbm5lbElkKSB7XG4gICAgICBpZiAoUGlsbHMubGlzdGVuZXIgJiYgUGlsbHMubGlzdGVuZXIuaXNFbnVtZXJhdGVkRmllbGQpIHtcbiAgICAgICAgcmV0dXJuIFBpbGxzLmxpc3RlbmVyLmlzRW51bWVyYXRlZEZpZWxkKGNoYW5uZWxJZCwgUGlsbHMucGlsbHNbY2hhbm5lbElkXSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVtb3ZlKGNoYW5uZWxJZCkge1xuICAgICAgZGVsZXRlIFBpbGxzLnBpbGxzW2NoYW5uZWxJZF07XG4gICAgICBpZiAoUGlsbHMubGlzdGVuZXIpIHtcbiAgICAgICAgUGlsbHMubGlzdGVuZXIucmVtb3ZlKGNoYW5uZWxJZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc29ydChjaGFubmVsSWQsIHNvcnQpIHtcbiAgICAgIGlmIChQaWxscy5saXN0ZW5lciAmJiBQaWxscy5saXN0ZW5lci5zb3J0KSB7XG4gICAgICAgIFBpbGxzLmxpc3RlbmVyLnNvcnQoY2hhbm5lbElkLCBzb3J0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNjYWxlKGNoYW5uZWxJZCwgc2NhbGVUeXBlKSB7XG4gICAgICBpZiAoUGlsbHMubGlzdGVuZXIgJiYgUGlsbHMubGlzdGVuZXIucmVzY2FsZSkge1xuICAgICAgICBQaWxscy5saXN0ZW5lci5yZXNjYWxlKGNoYW5uZWxJZCwgc2NhbGVUeXBlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0b2dnbGVGaWx0ZXJJbnZhbGlkKCkge1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyICYmIFBpbGxzLmxpc3RlbmVyLnRvZ2dsZUZpbHRlckludmFsaWQpIHtcbiAgICAgICAgUGlsbHMubGlzdGVuZXIudG9nZ2xlRmlsdGVySW52YWxpZCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYW5zcG9zZSgpIHtcbiAgICAgIGlmIChQaWxscy5saXN0ZW5lciAmJiBQaWxscy5saXN0ZW5lci50cmFuc3Bvc2UpIHtcbiAgICAgICAgUGlsbHMubGlzdGVuZXIudHJhbnNwb3NlKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmUtcGFyc2UgdGhlIHNwZWMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2FueX0gc3BlY1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIHBhcnNlKHNwZWMpIHtcbiAgICAgIGlmIChQaWxscy5saXN0ZW5lcikge1xuICAgICAgICBQaWxscy5saXN0ZW5lci5wYXJzZShzcGVjKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGQgU3BlYyB0byBiZSBwcmV2aWV3ZWQgKGZvciBWb3lhZ2VyMilcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7YW55fSBzcGVjXG4gICAgICovXG4gICAgZnVuY3Rpb24gcHJldmlldyhzcGVjKSB7XG4gICAgICBpZiAoUGlsbHMubGlzdGVuZXIpIHtcbiAgICAgICAgUGlsbHMubGlzdGVuZXIucHJldmlldyhzcGVjKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHdob2xlIHBpbGwgc2V0XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2FueX0gc3BlY1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVwZGF0ZShzcGVjKSB7XG4gICAgICBpZiAoUGlsbHMubGlzdGVuZXIpIHtcbiAgICAgICAgUGlsbHMubGlzdGVuZXIudXBkYXRlKHNwZWMpO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgLyoqIFJlc2V0IFBpbGxzICovXG4gICAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgICBpZiAoUGlsbHMubGlzdGVuZXIpIHtcbiAgICAgICAgUGlsbHMubGlzdGVuZXIucmVzZXQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge2FueX0gcGlsbCBwaWxsIGJlaW5nIGRyYWdnZWRcbiAgICAgKiBAcGFyYW0ge2FueX0gY2lkRHJhZ0Zyb20gY2hhbm5lbCBpZCB0aGF0IHRoZSBwaWxsIGlzIGRyYWdnZWQgZnJvbVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGRyYWdTdGFydChwaWxsLCBjaWREcmFnRnJvbSkge1xuICAgICAgUGlsbHMuZHJhZ2dpbmcgPSBwaWxsO1xuICAgICAgUGlsbHMuY2lkRHJhZ0Zyb20gPSBjaWREcmFnRnJvbTtcbiAgICB9XG5cbiAgICAvKiogU3RvcCBwaWxsIGRyYWdnaW5nICovXG4gICAgZnVuY3Rpb24gZHJhZ1N0b3AoKSB7XG4gICAgICBQaWxscy5kcmFnZ2luZyA9IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogV2hlbiBhIHBpbGwgaXMgZHJvcHBlZFxuICAgICAqIEBwYXJhbSBjaWREcmFnVG8gIGNoYW5uZWxJZCB0aGF0J3MgdGhlIHBpbGwgaXMgYmVpbmcgZHJhZ2dlZCB0b1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGRyYWdEcm9wKGNpZERyYWdUbykge1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyKSB7XG4gICAgICAgIFBpbGxzLmxpc3RlbmVyLmRyYWdEcm9wKGNpZERyYWdUbywgUGlsbHMuY2lkRHJhZ0Zyb20pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBQaWxscztcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIFNlcnZpY2UgZm9yIHNlcnZpbmcgVkwgU2NoZW1hXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5mYWN0b3J5KCdTY2hlbWEnLCBmdW5jdGlvbih2ZywgdmwsIHZsU2NoZW1hKSB7XG4gICAgdmFyIFNjaGVtYSA9IHt9O1xuXG4gICAgU2NoZW1hLnNjaGVtYSA9IHZsU2NoZW1hO1xuXG4gICAgU2NoZW1hLmdldENoYW5uZWxTY2hlbWEgPSBmdW5jdGlvbihjaGFubmVsKSB7XG4gICAgICB2YXIgZGVmID0gbnVsbDtcbiAgICAgIHZhciBlbmNvZGluZ0NoYW5uZWxQcm9wID0gU2NoZW1hLnNjaGVtYS5kZWZpbml0aW9ucy5FbmNvZGluZy5wcm9wZXJ0aWVzW2NoYW5uZWxdO1xuICAgICAgLy8gZm9yIGRldGFpbCwganVzdCBnZXQgdGhlIGZsYXQgdmVyc2lvblxuICAgICAgdmFyIHJlZiA9IGVuY29kaW5nQ2hhbm5lbFByb3AgP1xuICAgICAgICAoZW5jb2RpbmdDaGFubmVsUHJvcC4kcmVmIHx8IGVuY29kaW5nQ2hhbm5lbFByb3Aub25lT2ZbMF0uJHJlZikgOlxuICAgICAgICAnRmllbGREZWYnOyAvLyBqdXN0IHVzZSB0aGUgZ2VuZXJpYyB2ZXJzaW9uIGZvciBBTlkgY2hhbm5lbFxuICAgICAgZGVmID0gcmVmLnNsaWNlKHJlZi5sYXN0SW5kZXhPZignLycpKzEpO1xuICAgICAgcmV0dXJuIFNjaGVtYS5zY2hlbWEuZGVmaW5pdGlvbnNbZGVmXTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFNjaGVtYTtcbiAgfSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
